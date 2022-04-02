
const axios = require('axios');
const tl = require('azure-pipelines-task-lib/task');

module.exports.getSecrets = async () => {

    
    const serviceToken = tl.getInput('serviceToken');
    const response = await axios.get(`https://api.doppler.com/v3/configs/config/secrets/download?format=json`, { 
        auth: {
            username: serviceToken,
            password: ''
        } 
    });

    return response.data
}