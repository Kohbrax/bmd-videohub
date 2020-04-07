import { VideohubConnection, VideohubEventType, VideohubEventCallback, VideohubStatus } from "./VideohubConnection";



export class Videohub {
	private conn: VideohubConnection;
	private status: VideohubStatus;
	private firstStatusPromise: Promise<void>;
	private firstStatusPromiseResolve: Function = null;
	private firstStatusResolved = false;

	constructor(private host: string, private port: number){
		this.firstStatusPromise = new Promise((resolve, reject) => {
			this.firstStatusPromiseResolve = resolve;
		})

		this.conn = new VideohubConnection(host, port);
	}

	public async on(type: VideohubEventType, fn: VideohubEventCallback){
		this.conn.on(type, fn);
	}

	public async off(type: VideohubEventType, fn: VideohubEventCallback){
		this.conn.off(type, fn);
	}

	public async init(){
		await this.conn.init();
		this.conn.on('update', (newStatus) => {
			if(!this.firstStatusResolved){
				this.firstStatusResolved = true;
				this.firstStatusPromiseResolve();
			}

			this.status = newStatus;
		});
	}

	public getStatus(){
		return this.status;
	}

	public async getStatusAsync() {
		await this.firstStatusPromise;
		return this.status;
	}

	public setLabel(type: "output" | "input" | "monitoring" | "serial-port", num: number, newName: string){
		let str = "";

		switch(type){
			case "input":
				str += "INPUT LABELS:\n";
				break;

			case "output":
				str += "OUTPUT LABELS:\n";
				break;

			case "monitoring":
				str += "MONITORING OUTPUT LABELS:\n";
				break;

			case "serial-port":
				str += "SERIAL PORT LABELS:\n";
				break;
		}
		str += (num - 1)+" "+newName+"\n";
		str += "\n";
		this.conn.send(Buffer.from(str));
	}

	public setRouting(type: "output" | "monitoring" | "serial-port" | "processing-unit", outputNumber: number, inputNumber: number){
		let str = "";

		switch(type){
			case "output":
				str += "VIDEO OUTPUT ROUTING:\n";
				break;

			case "monitoring":
				str += "VIDEO MONITORING OUTPUT ROUTING:\n";
				break;

			case "serial-port":
				str += "SERIAL PORT ROUTING:\n";
				break;

			case "processing-unit":
				str += "PROCESSING UNIT ROUTING:\n";
				break;
		}

		str += (outputNumber - 1)+" "+(inputNumber - 1)+"\n";
		str += "\n";
		this.conn.send(Buffer.from(str));
	}

	public setLock(type: "output" | "monitoring" | "serial-port" | "processing-unit", num: number, isLocked: boolean){
		let str = "";

		switch(type){
			case "output":
				str += "VIDEO OUTPUT LOCKS:\n";
				break;

			case "monitoring":
				str += "MONITORING OUTPUT LOCKS:\n";
				break;

			case "serial-port":
				str += "SERIAL PORT LOCKS:\n";
				break;

			case "processing-unit":
				str += "PROCESSING UNIT LOCKS:\n";
				break;
		}

		str += (num - 1)+" "+((isLocked) ? "O" : "U")+"\n";
		str += "\n";
		this.conn.send(Buffer.from(str));
	}
}