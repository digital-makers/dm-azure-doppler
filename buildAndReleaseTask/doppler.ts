import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
//import tr = require('azure-pipelines-task-lib/toolrunner');
import writefile = require('writefile')
import shell = require('shelljs');
import fs = require('fs');

import doppler = require('./doppler-secrets.js');



const runEnvCreation = tl.getBoolInput('runEnvCreation');
const runFileProcessing = tl.getBoolInput('runFileProcessing');
const workingDirectory = tl.getPathInput('workingDirectory', /*required*/ true, /*check*/ true);

const clearEnvFile = tl.getBoolInput('clearEnvFile');


async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));
        let result = tl.TaskResult.Succeeded;


        console.log('========================== Starting Command Output ===========================');

        
        console.log(`workingDirectory: ${workingDirectory}`)
        console.log(`runEnvCreation: ${runEnvCreation}`)
        console.log(`runFileProcessing: ${runFileProcessing}`)
        console.log(`clearEnvFile: ${clearEnvFile}`)


        
        if (runEnvCreation && clearEnvFile) {
            //clear the env file to start with.
            await shell.exec(`rm -f ${path.join(workingDirectory, '.env')}`, {silent:true})
        }

        //open the env file for writing later, if we need to.
        const dotenvfile = fs.createWriteStream(path.join(workingDirectory, '.env'), {
            flags: 'a' // 'a' means appending (old data will be preserved)
        })
        
        //pull in the secrets that this service token allows
        const secrets = await doppler.getSecrets();
        if (!secrets) {
            console.log(`doppler secrets failed: `, secrets);
            shell.exit(1);
            result = tl.TaskResult.Failed;
        } else {

            const keys = Object.keys(secrets)
            for (const key of keys) {

                if (runEnvCreation && !key.endsWith('_BASE64')) {
                    //if we're writing to a dotenv file, do it (but not any that end with _BASE64 cos they are massive)
                    dotenvfile.write(`\n${key}=${secrets[key].computed}`)
                    console.log(`Wrote ENV: ${key}`)
                }

                //if we're handling file secrets that are encoded into base64 and named appropriately,
                //then convert them back using the relevent *_FILENAME secret.
                if (runFileProcessing && key.endsWith('_BASE64')) {

                    let filenameKey = key.substr(0, ( key.length-('_BASE64'.length)) ).concat('_FILENAME')
                    let fileFullPath = path.join(workingDirectory, secrets[filenameKey].computed);

                    if (secrets[filenameKey]) {


                        //decode from base64
                        let buff = Buffer.from(secrets[key].computed, 'base64');
                        await writefile(fileFullPath, buff);
                        console.log(`The contents of ${key} have been decoded to: ${fileFullPath} `)

                    } else {
                        console.log(`Did not find key ${filenameKey} so skipped decoding ${key}.`)
                        result = tl.TaskResult.SucceededWithIssues;
                    }


                }


            }


        }

        dotenvfile.close();
        tl.setResult(result, null, true);
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed', true);
    }
}

run();