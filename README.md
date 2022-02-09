# mailappend

Upload email files to a folder in an IMAP server.

```
Upload an email or multiple emails to a folder in an IMAP server

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
```

## License

**MIT**
