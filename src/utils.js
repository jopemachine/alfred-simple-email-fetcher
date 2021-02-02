const path = require('path')

module.exports = {
  getParentAbsolutePath () {
    const folderPath = __dirname.split(path.sep)
    folderPath.pop()
    return folderPath.join(path.sep)
  },

  getTimeStamp (date) {
    const year = date.getFullYear()
    const month = ('0' + (date.getMonth() + 1)).substr(-2)
    const day = ('0' + date.getDate()).substr(-2)
    const hour = ('0' + date.getHours()).substr(-2)
    const minutes = ('0' + date.getMinutes()).substr(-2)
    const seconds = ('0' + date.getSeconds()).substr(-2)

    return year + '-' + month + '-' + day + ' ' + hour + ':' + minutes + ':' + seconds
  }
}
