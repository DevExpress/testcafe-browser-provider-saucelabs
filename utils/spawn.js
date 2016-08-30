var nodeSpawn = require('cross-spawn');
var Promise   = require('pinkie');
var assign    = require('lodash').assign;


module.exports = function (cmd, args, envs) {
    return new Promise(function (resolve, reject) {
        var childProcess = nodeSpawn(cmd, args, {
            stdio: 'inherit',
            shell: true,
            env:   assign({}, process.env, envs)
        });

        childProcess.on('exit', function (code) {
            if (code)
                reject(new Error('Process ' + cmd + ' exited with code: ' + code));
            else
                resolve();
        });
    });
};
