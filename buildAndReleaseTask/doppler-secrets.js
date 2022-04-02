
const axios = require('axios');
const tl = require('azure-pipelines-task-lib/task');

module.exports.getSecrets = async () => {

    
    const serviceToken = tl.getInput('serviceToken');

    const response = await axios({
        "method": "GET",
        "url": "https://api.doppler.com/v3/configs/config/secrets/download",
        "params": {
            "format": "json"
        },
        "auth": {
            "username": serviceToken,
            "password": "aaa"
        }
    });

    // echo some non sensitive data so we know it worked.
    console.log(`${response.data.DOPPLER_PROJECT}, ${response.data.DOPPLER_ENVIRONMENT}, ${response.data.DOPPLER_CONFIG}`)

    return response.data
}