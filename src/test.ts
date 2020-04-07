import { Videohub } from "./lib/Videohub";

const DEV_IP = "192.168.0.80"
const DEV_PORT = 9990;


async function test(){
    let v = new Videohub(DEV_IP, DEV_PORT);
    await v.init();
    await Sleep(100);

    console.log(v.getStatus());
    v.setLock("output", 1, false);

    for(let i = 1; i <= 10; i++){
        await Sleep(200);

        v.setRouting("output", 1, i);
    }

    for(let i = 0; i < 10; i++){
        await Sleep(200);

        v.setLabel("input", 1, "X".repeat(i));
    }

    for(let i = 0; i < 10; i++){
        await Sleep(200);

        v.setLabel("output", 6, "X".repeat(i));
    }


}

async function Sleep(ms: number): Promise<void>{
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), ms);
    });
}

test();