#!/usr/bin/env node
/* eslint global-require: 0 */

'use strict';

require('dotenv').config();

const argv = require('minimist')(process.argv.slice(2), { boolean: ['tls', 't', 'json', 'j', 'help'] });
const { ImapFlow } = require('imapflow');
const MailComposer = require('nodemailer/lib/mail-composer');
const fs = require('fs');
const pathlib = require('path');

if ((argv._ && argv._[0] === 'help') || argv.help) {
    console.log(`Upload an email or multiple emails to a folder in an IMAP server

Usage:
  mailappend <opts> path1.eml path2.eml ... pathN.eml
  mailappend help
  mailappend license

If file path is not provided or it is "-", then read input from stdin instead.

Opts:
  --host, -h   [hostname] IMAP server hostname
  --port, -p   [port]     IMAP server port
  --tls,  -t              If set, then use TLS (autoenabled on port 993)
  --user, -u   [username] IMAP account username
  --pass, -a   [password] IMAP account password
  --folder, -f [path]     Folder to upload the message to (defaults to "INBOX")
  --flag, -l   [flag]     Message flags. Can be set multiple times
  --json, -j              If set, then compile message based on input JSON structure

Environment variables:
  APPEND_HOST maps to --host
  APPEND_PORT maps to --port
  APPEND_TLS  maps to --tls (use "true" or "yes" as the value)
  APPEND_USER maps to --user
  APPEND_PASS maps to --pass

If current working directory includes a file called ".env" then environment variables
are loaded from that file.
`);
    process.exit(0);
}

if ((argv._ && argv._[0] === 'license') || argv.license) {
    let licenseFile = fs.readFileSync(pathlib.join(__dirname, '..', 'LICENSE.txt'), 'utf-8');
    let licenseList = fs.readFileSync(pathlib.join(__dirname, '..', 'licenses.txt'), 'utf-8');

    console.log(
        `Mailappend License
==================

${licenseFile}

Included Modules
================

${licenseList}
`
    );

    process.exit(0);
}

let paths = Array.from(
    new Set(
        []
            .concat(argv._ || '-')
            .map(val => (val || '').toString().trim())
            .filter(val => val)
    )
);

if (paths.includes('-') && paths[0] !== '-') {
    // move stdin to 1st
    paths.splice(paths.indexOf('-'), 1);
    paths.unshift('-');
}

let host = (argv.host || argv.h || process.env.APPEND_HOST || '').toString().trim() || '127.0.0.1';
let port = Number(argv.port) || Number(argv.p) || Number(process.env.APPEND_PORT) || 993;
let secure = !!argv.tls || !!argv.t || /^(y|true|1)/i.test(process.env.APPEND_TLS) || port === 993;
let user = (argv.user || argv.u || process.env.APPEND_USER || '').toString().trim();
let pass = (argv.pass || argv.a || process.env.APPEND_PASS || '').toString().trim();
let json = argv.json || argv.j;

let folder = argv.folder || argv.f || 'INBOX';
let flags = [].concat(argv.flags || argv.l || []);

let config = {
    host,
    port,
    secure,
    tls: {
        rejectUnauthorized: false
    },
    auth: {
        user,
        pass
    }
};

function readStdInput() {
    return new Promise((resolve, reject) => {
        let chunks = [];
        let chunklen = 0;
        process.stdin.on('readable', () => {
            let chunk;
            while ((chunk = process.stdin.read()) !== null) {
                chunks.push(chunk);
                chunklen += chunk.length;
            }
        });
        process.stdin.on('end', () => {
            resolve(Buffer.concat(chunks, chunklen));
        });
    });
}

let main = async () => {
    let c = new ImapFlow(config);

    c.on('error', err => {
        c.log.error(err);
        c.logout()
            .catch(err => false)
            .finally(() => {
                process.exit(1);
            });
    });

    await c.connect();
    try {
        let seq = 0;
        for (let filePath of paths) {
            let rawMessageBuffer;
            seq++;
            if (!filePath || filePath === '-') {
                c.log.info({ msg: 'Reading message from stdin', seq });
                rawMessageBuffer = await readStdInput();
            } else {
                c.log.info({ msg: `Reading message from file`, seq, path: filePath });
                rawMessageBuffer = await fs.promises.readFile(filePath);
            }

            if (json) {
                let data = JSON.parse(rawMessageBuffer.toString());
                const mail = new MailComposer(data);
                const compiled = mail.compile();
                compiled.keepBcc = true;
                rawMessageBuffer = await compiled.build();
            }

            await c.append(folder, rawMessageBuffer, flags);
        }
    } finally {
        await c.logout();
    }
};

main().catch(err => {
    console.error(err);
    process.exit(1);
});
