const http = require(`http`)
const { spawn } = require(`child_process`)

function getFlagValue(args, flags) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (flags.includes(arg)) {
      return args[index + 1]
    }

    for (const flag of flags) {
      if (arg.startsWith(`${flag}=`)) {
        return arg.slice(flag.length + 1)
      }
    }
  }

  return undefined
}

const forwardedArgs = process.argv.slice(2)
const configuredHost = getFlagValue(forwardedArgs, [`-H`, `--host`]) || process.env.HOST
const configuredPort = getFlagValue(forwardedArgs, [`-p`, `--port`]) || process.env.PORT || `8000`
const displayHost =
  configuredHost && configuredHost !== `0.0.0.0` && configuredHost !== `::`
    ? configuredHost
    : `localhost`
const probeHost =
  configuredHost && configuredHost !== `0.0.0.0` && configuredHost !== `::`
    ? configuredHost
    : `127.0.0.1`

console.log(`[start] Starting Gatsby dev server at http://${displayHost}:${configuredPort}/`)
console.log(`[start] This command stays running. A cold start can take around a minute.`)

const child = spawn(process.execPath, [require.resolve(`gatsby/cli`), `develop`, ...forwardedArgs], {
  env: process.env,
  stdio: `inherit`,
})

let readyLogged = false
const readyTimer = setInterval(() => {
  const request = http.get(
    {
      host: probeHost,
      port: configuredPort,
      path: `/`,
      timeout: 1000,
    },
    response => {
      response.resume()

      if (!readyLogged && response.statusCode && response.statusCode < 500) {
        readyLogged = true
        clearInterval(readyTimer)
        console.log(`\n[start] Dev server is ready at http://${displayHost}:${configuredPort}/`)
      }
    }
  )

  request.on(`timeout`, () => request.destroy())
  request.on(`error`, () => {})
}, 1000)

function stopChild(signal) {
  if (!child.killed) {
    child.kill(signal)
  }
}

for (const signal of [`SIGINT`, `SIGTERM`, `SIGHUP`]) {
  process.on(signal, () => stopChild(signal))
}

child.on(`exit`, (code, signal) => {
  clearInterval(readyTimer)

  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
