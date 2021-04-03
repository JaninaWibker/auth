const atob = (str: string) => Buffer.from(str, 'base64').toString('binary')

const btoa = (str_or_buff: string | Buffer) => {
  if(str_or_buff instanceof Buffer) {
    return str_or_buff.toString('base64')
  } else {
    return Buffer.from(str_or_buff.toString(), 'binary').toString('base64')
  }
}

export {
  atob,
  btoa
}
