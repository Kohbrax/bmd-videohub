import * as net from "net";
import { EventEmitter } from "events";

export interface VideohubConnectionErrror extends Error { }

export interface VideohubConnectionEvent{
	on(type: 'error', cb: (err: VideohubConnectionErrror) => void): void;
}

export type VideohubEventType = "error" | "update";
export type VideohubEventCallback = (data: any) => void;

const RB_SIZE = 1024*1024;

interface ParserDictionary {
	[index: string]: (header: string, lines: Array<string>) => void;
}

export interface VideohubDeviceStatus {
	devicePresent: boolean;
	modelName: string;
	friendlyName: string;
	uniqueId: string;
	videoInputs: number;
	videoProcessingUnits: number;
	videoOutputs: number;
	videoMonitoringOutputs: number;
	serialPorts: number;
}

export interface VideohubStatus{
	deviceInfo: VideohubDeviceStatus,

	inputLabels: {
		[index: number]: string;
	},

	outputLabels: {
		[index: number]: string;
	},

	serialPortLabels: {
		[index: number]: string;
	},

	outputLocks: {
		[index: number]: boolean;
	}

	outputRouting: {
		[index: number]: number
	},

	videoInputStatus: {
		[index: number]: string
	},

	videoOutputStatus: {
		[index: number]: string
	},

	serialPortLocks: {
		[index: number]: boolean
	},

	serialPortRouting: {
		[index: number]: number
	},

	serialPortDirections: {
		[index: number]: string
	},

	serialPortStatus: {
		[index: number]: string
	},

	alarmStatus: {
		[index: string]: string
	},
}

export class VideohubConnection implements VideohubConnectionEvent{
	private socket: net.Socket = null;
	private event: EventEmitter = new EventEmitter();

	private toParseStr: string = "";

	private parsers: ParserDictionary = { };
	private currentStatus: VideohubStatus = {
		deviceInfo: null,
		inputLabels: { },
		outputLabels: { },
		serialPortLabels: { },
		outputLocks: { },
		outputRouting: { },
		serialPortDirections: { },
		serialPortLocks: { },
		serialPortRouting: { },
		serialPortStatus: { },
		videoInputStatus: { },
		videoOutputStatus: { },
		alarmStatus: { },
	};

	private version: string = null;

	constructor(private host: string, private port: number) {
		this.parsers['PROTOCOL PREAMBLE'] = this.parseProtocolPreamble.bind(this);
		this.parsers['VIDEOHUB DEVICE'] = this.parseVideohubDevice.bind(this);
		this.parsers['INPUT LABELS'] = this.parseLables.bind(this);
		this.parsers['OUTPUT LABELS'] = this.parseLables.bind(this);
		this.parsers['SERIAL PORT LABELS'] = this.parseLables.bind(this);

		this.parsers['VIDEO OUTPUT LOCKS'] = this.parseVideoOutputLocks.bind(this);
		this.parsers['SERIAL PORT LOCKS'] = this.parseSerialPortLocks.bind(this);

		this.parsers['VIDEO OUTPUT ROUTING'] = this.parseVideoOutputRouting.bind(this);
		this.parsers['SERIAL PORT ROUTING'] = this.parseSerialPortRouting.bind(this);

		this.parsers['VIDEO INPUT STATUS'] = this.parseVideoInputStatus.bind(this);
		this.parsers['VIDEO OUTPUT STATUS'] = this.parseVideoOutputStatus.bind(this);
		this.parsers['SERIAL PORT STATUS'] = this.parseSerialPortStatus.bind(this);
		this.parsers['ALARM STATUS'] = this.parseAlarmStatus.bind(this);
		

		this.parsers['SERIAL PORT DIRECTIONS'] = this.parseSerialPortDirections.bind(this);

		this.parsers['ACK'] = this.parseAck.bind(this);
		this.parsers['END PRELUDE'] = this.parseEndPrelude.bind(this);
		
	}

	public async init(){
		return new Promise((resolve, reject) => {  
			this.socket = net.createConnection({
				host: this.host,
				port: this.port,
			}, () => {
				// connected
				// request output labels
				// this.send(Buffer.from("OUTPUT LABELS:\n\n"));
				resolve();
			});
			
			this.socket.on('data', this.parse.bind(this))

			this.socket.on('error', (err) => {
				reject(err);
			});
		});
	}

	public async on(name: VideohubEventType, cb: VideohubEventCallback){
		return this.event.on(name, cb);
	}

	public async off(name: VideohubEventType, cb: VideohubEventCallback){
		this.event.off(name, cb)
	}

	private parse(data: Buffer): void{
		this.toParseStr += data.toString('utf-8');

		let i = 0;
		let index;
		let updated = false;
		while(index = this.toParseStr.indexOf("\n\n")){
			if(index == -1)
				break;
			
			let parse = this.toParseStr.substr(0, index);
			let lines = parse.split("\n");

			let header = (lines.splice(0, 1))[0];

			// strip the ":" in header line
			if(header[header.length - 1] == ":")
				header = header.substr(0, header.length - 1)

			if(this.parsers[header]){
				this.parsers[header](header, lines);
			} else {
				throw new Error("Parsing-Error: Unable to determine parser for header: "+header);
			}
			this.toParseStr = this.toParseStr.substr(index + 2);
			updated = true;
			i++;
			if(i > 2)
				break;
		}

		if(updated){
			this.event.emit('update', this.currentStatus);
		}
	}
	
	
	public parseProtocolPreamble(header: string, lines: string[]) {
		// im only expecting a 'version' line
		if(lines.length != 1)
			throw new Error("Invalid Number of Lines in PROTOCOL PREAMBLE. Expected 1, got: "+lines.length);
		
		let version = lines[0].split(": ");
		this.version = version[1];
	}

	public parseVideohubDevice(header: string, lines: string[]){
		let info: VideohubDeviceStatus | any = { };

		for(let l of lines){
			let d = l.split(": ");
			switch(d[0]){
				case 'Device present':
					info.devicePresent = (d[1] == "true") ? true : false;
					break;

				case 'Model name':
					info.modelName = d[1];
					break;

				case 'Friendly name':
					info.friendlyName = d[1];
					break;

				case 'Unique ID':
					info.uniqueId = d[1];
					break;

				case 'Video inputs':
					info.videoInputs = parseInt(d[1]);
					break;

				case 'Video processing units':
					info.videoProcessingUnits = parseInt(d[1]);
					break;

				case 'Video outputs':
					info.videoOutputs = parseInt(d[1]);
					break;

				case 'Video monitoring outputs':
					info.videoMonitoringOutputs = parseInt(d[1]);
					break;
				
				case 'Serial ports':
					info.serialPorts = parseInt(d[1]);
					break;
			}
		}

		this.currentStatus['deviceInfo'] = info;
	}

	public parseLables(header: string, lines: string[]) {
		let labels = null;

		if(header == "INPUT LABELS") {
			labels = this.currentStatus.inputLabels;
		}

		if(header == "OUTPUT LABELS") {
			labels = this.currentStatus.outputLabels;
		}

		if(header == "SERIAL PORT LABELS") {
			labels = this.currentStatus.serialPortLabels;
		}

		if(labels == null){
			throw new Error("Invalid header for parseLabels: "+header);
		}

		for(let l of lines){
			let nameIndex = l.indexOf(" ");
			let inputNumber = l.substr(0, nameIndex);
			let name = l.substr(nameIndex + 1);

			labels[parseInt(inputNumber) + 1] = name;
		}
	}

	public parseVideoOutputLocks(header: string, lines: string[]) {
		let locks = this.currentStatus.outputLocks;
		for(let l of lines){
			let [inputNumber, state] = l.split(" ", 2);

			locks[parseInt(inputNumber) + 1] = (state == "O") ? true : false;
		}
	}

	public parseVideoOutputRouting(header: string, lines: string[]) {
		let routing = this.currentStatus.outputRouting;

		for(let l of lines){
			let [outputNumber, inputNumber] = l.split(" ", 2);

			routing[parseInt(outputNumber) + 1] = parseInt(inputNumber) + 1;
		}
	}

	public parseVideoInputStatus(header: string, lines: string[]) {
		let status = this.currentStatus.videoInputStatus;
		for(let l of lines){
			let [inputNumber, state] = l.split(" ", 2);

			status[parseInt(inputNumber) + 1] = state;
		}
	}

	public parseVideoOutputStatus(header: string, lines: string[]) {
		let status = this.currentStatus.videoOutputStatus;
		for(let l of lines){
			let [inputNumber, state] = l.split(" ", 2);

			status[parseInt(inputNumber) + 1] = state;
		}
	}

	public parseSerialPortLocks(header: string, lines: string[]) {
		let locks = this.currentStatus.serialPortLocks;
		for(let l of lines){
			let [inputNumber, state] = l.split(" ", 2);

			locks[parseInt(inputNumber) + 1] = (state == "O") ? true : false;
		}
	}

	public parseSerialPortRouting(header: string, lines: string[]) {
		let routing = this.currentStatus.serialPortRouting;

		for(let l of lines){
			let [outputNumber, inputNumber] = l.split(" ", 2);

			routing[parseInt(outputNumber) + 1] = parseInt(inputNumber) + 1;
		}
	}

	public parseSerialPortDirections(header: string, lines: string[]) {
		let directions = this.currentStatus.serialPortDirections;
		for(let l of lines){
			let [inputNumber, state] = l.split(" ", 2);

			directions[parseInt(inputNumber) + 1] = state;
		}
	}

	public parseSerialPortStatus(header: string, lines: string[]) {
		let status = this.currentStatus.serialPortStatus;
		for(let l of lines){
			let [inputNumber, state] = l.split(" ", 2);

			status[parseInt(inputNumber) + 1] = state;
		}
	}

	public parseAlarmStatus(header: string, lines: string[]) {
		let status = this.currentStatus.alarmStatus;
		for(let l of lines){
			let [name, state] = l.split(":");

			status[name] = state;
		}
	}

	public parseAck(header: string, lines: string[]){
	}

	public parseEndPrelude(header: string, lines: string[]){
		
	}
	

	public getVersion() {
		return this.version;
	}

	public send(data: Buffer){
		this.socket.write(data);
	}
}