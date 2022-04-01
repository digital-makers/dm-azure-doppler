import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import shell = require('shelljs');

const serviceToken = tl.getInput('serviceToken');
const workingDirectory = tl.getPathInput('workingDirectory', /*required*/ true, /*check*/ true);

const setAzureEnvs = tl.getBoolInput('setAzureEnvs');

import doppler = require('./doppler-secrets.js');

async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));
        let result = tl.TaskResult.Succeeded;

        console.log('========================== Starting Command Output ===========================');
        
        console.log(`workingDirectory: ${workingDirectory}`)
        console.log(`setAzureEnvs: ${setAzureEnvs}`)
        
        
        
        //pull in the secrets that this service token allows
        const secrets = await doppler.getSecrets();
        if (!secrets) {
            console.log(`doppler secrets failed, check your token is correct: `, secrets);
            shell.exit(1);
            result = tl.TaskResult.Failed;
        } else {
            const keys = Object.keys(secrets)
            for (const key of keys) {

                if (setAzureEnvs && !key.endsWith('_BASE64')) {
                    //set the Azure pipeline variables, but again, ignore any base64 ones because of potential size.
                    tl.setVariable(key, secrets[key].computed, false)
                    console.log(`Set ENV: ${key}`)
                }

            }

        }

        tl.setResult(result, null, true);
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed', true);
    }
}

run();