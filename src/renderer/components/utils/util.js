import path from 'path'
import { remote } from 'electron'
import fs from 'fs'

let errMsg
let dirhubDir = path.join(remote.app.getPath('userData'), 'dirhub')

if (!fs.existsSync(dirhubDir)) {
    fs.mkdirSync(dirhubDir)
}

let folderJson = path.join(remote.app.getPath('userData'), 'dirhub', 'folder.json')
let configJson = path.join(remote.app.getPath('userData'), 'dirhub', 'config.json')

if (!fs.existsSync(folderJson)) {
    fs.writeFileSync(folderJson, '[]')
}
if (!fs.existsSync(configJson)) {
    fs.writeFileSync(configJson, JSON.stringify({
        defaultFolder: '/',
        previewSize: 200,
    }))
}


let folders = JSON.parse(fs.readFileSync(folderJson).toString())
let config = JSON.parse(fs.readFileSync(configJson).toString())


export default {
    getFolders() {
        return folders.map(f => f)
    },
    addFolder(dir) {
        for (let i = 0; i < folders.length; i++) {
            if (folders[i] == dir) {
                errMsg = 'folder already exists'
                return false
            }
        }
        if (!fs.existsSync(dir)) {
            errMsg = 'dir not found'
            return false
        }
        if (!fs.statSync(dir).isDirectory()) {
            errMsg = 'not dir'
            return false
        }
        folders.push(dir)
        fs.writeFileSync(folderJson, JSON.stringify(folders))
        return true
    },
    setFolders(dirs) {
        for (let i = 0; i < dirs.length; i++) {
            if (!fs.existsSync(dirs[i])) {
                errMsg = 'dir not found'
                return false
            }
            if (!fs.statSync(dirs[i]).isDirectory()) {
                errMsg = 'not dir'
                return false
            }
        }
        folders = dirs
        fs.writeFileSync(folderJson, JSON.stringify(folders))
        return true
    },
    delFolder(dir) {
        folders = folders.filter(f => f != dir)
        fs.writeFileSync(folderJson, JSON.stringify(folders))
        return true
    },
    getConfig() {
        return config
    },
    setConfig(key, val) {
        config[key] = val
        fs.writeFileSync(configJson, JSON.stringify(config))
        return true
    },
    getDefaultFolder() {
        return config.defaultFolder ? config.defaultFolder : '/'
    },
    setDefaultFolder(folder) {
        return this.setConfig('defaultFolder', folder)
    },
    scanDir(dir) {
        if (!fs.existsSync(dir)) {
            errMsg = 'dir not found'
            return false
        }
        if (!fs.statSync(dir).isDirectory()) {
            errMsg = 'not dir'
            return false
        }
        let list = []
        let origin = fs.readdirSync(dir)
        if (!dir.endsWith('/')) {
            dir = dir + '/'
        }
        origin.forEach((f) => {
            let stat = fs.statSync(dir + f)
            if (stat.isFile()) {
                list.push({
                    base: f,
                    name: dir + f,
                    dir: false,
                    img: this.isImg(f),
                })
            }
            if (stat.isDirectory()) {
                list.push({
                    base: f,
                    name: dir + f,
                    dir: true,
                })
            }
        })
        list = list.sort((a, b) => {
            let aNo = a.base.split('.')[0]
            let bNo = b.base.split('.')[0]
            let aInt = isNaN(parseInt(aNo)) ? 0 : parseInt(aNo)
            let bInt = isNaN(parseInt(bNo)) ? 0 : parseInt(bNo)
            if (!isNaN(aNo) && !isNaN(bNo)) {
                return aNo - bNo
            } else {
                if (aInt - bInt !== 0) {
                    return bInt - aInt
                }
                if (isNaN(aNo) && !isNaN(bNo)) {
                    return 1
                }
                if (!isNaN(aNo) && isNaN(bNo)) {
                    return -1
                } else {

                    return a.base.toLowerCase() > b.base.toLowerCase() ? 1 : -1
                }
            }
        })
        return list
    },
    isImg(file) {
        return ['jpg', 'png', 'jpeg', 'bmp', 'gif', 'webp'].includes(path.extname(file).toLowerCase().slice(1))
    },
    getPreviewSize() {
        return config.previewSize ? config.previewSize : 200
    },
    setPreviewSize(size) {
        return this.setConfig('previewSize', size)
    },
    errMsg() {
        let msg = errMsg
        errMsg = null
        return msg
    }
}