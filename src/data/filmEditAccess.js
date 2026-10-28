// This verifier gates local editing in the static app; it is not server authorization.
// Store only a salted password verifier here, never the password itself.
export const filmEditAccess = {
  "iterations": 600000,
  "saltHex": "76c3680e58c7b05d7ece59b445b15a9f",
  "hashHex": "d35f2744edb781daa14be5b40205c805bdff39899c44bf0bda2fa2bec705f89c"
};
