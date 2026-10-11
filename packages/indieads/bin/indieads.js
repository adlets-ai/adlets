#!/usr/bin/env node
import { run } from 'adlets'

process.exitCode = await run(process.argv.slice(2), console, 'indieads')
