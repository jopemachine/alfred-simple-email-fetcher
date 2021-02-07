const fs = require('fs')
const fsPromises = fs.promises;

(async function () {
  await fsPromises.rmdir('./htmlCache', { recursive: true })
})()
