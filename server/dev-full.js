const { spawn } = require('child_process')

function run(command, args, name) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    shell: true,
    stdio: 'pipe'
  })

  child.stdout.on('data', data => process.stdout.write(`[${name}] ${data}`))
  child.stderr.on('data', data => process.stderr.write(`[${name}] ${data}`))
  child.on('exit', code => {
    if (code !== 0) process.exitCode = code
  })
  return child
}

const api = run('node', ['server/server.js'], 'api')
const web = run('npm.cmd', ['run', 'dev:h5', '--', '--host', '0.0.0.0'], 'web')

function stop() {
  api.kill()
  web.kill()
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
