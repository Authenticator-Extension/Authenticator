function getToken() {
  let hash = document.location.hash;

  if (!hash) {
    return;
  }

  hash = hash.substr(1);

  let resData = hash.split('&');
  for (let i = 0; i < resData.length; i++) {
    let kv = resData[i];
    console.log(kv, /^(.*?)=(.*?)$/.test(kv))
    if (/^(.*?)=(.*?)$/.test(kv)) {
      let kvMatches = kv.match(/^(.*?)=(.*?)$/);
      let key = kvMatches[1];
      let value = kvMatches[2];
      console.log(key, value)
      if (key === 'access_token') {
        localStorage.dropboxToken = value;
        break;
      }
    }
  }

  window.close();
  return;
}

window.onload = getToken;