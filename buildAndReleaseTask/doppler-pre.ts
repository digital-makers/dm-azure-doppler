import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import shell = require('shelljs');

const serviceToken = tl.getInput('serviceToken');
const workingDirectory = tl.getPathInput('workingDirectory', /*required*/ true, /*check*/ true);

const installDoppler = tl.getBoolInput('installDoppler');
const setAzureEnvs = tl.getBoolInput('setAzureEnvs');

async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));
        let result = tl.TaskResult.Succeeded;

        console.log('========================== Starting Command Output ===========================');
        
        console.log(`workingDirectory: ${workingDirectory}`)
        console.log(`installDoppler: ${installDoppler}`)
        console.log(`setAzureEnvs: ${setAzureEnvs}`)
        
        //run the setup to install doppler
        if (installDoppler) {
            let shellResult = await shell.exec('(curl -Ls https://cli.doppler.com/install.sh || wget -qO- https://cli.doppler.com/install.sh) | sh');
            if (shellResult.code !== 0) {
                console.log(`doppler install failed: `, shellResult.code, shellResult.stdout, shellResult.stderr);
                shell.exit(1);
                result = tl.TaskResult.Failed;
            } else {
                console.log('doppler installed ', shellResult.stdout);
            }
        }
        
        
        //pull in the secrets that this service token allows
        let secretsJSON = await shell.exec(`doppler secrets --no-read-env --token=${serviceToken} --json`, {silent:true});
        if (secretsJSON.code !== 0) {
            console.log(`doppler secrets failed, check your token is correct: `, secretsJSON.code, secretsJSON.stdout, secretsJSON.stderr);
            shell.exit(1);
            result = tl.TaskResult.Failed;
        } else {

            const secrets = JSON.parse(secretsJSON)
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