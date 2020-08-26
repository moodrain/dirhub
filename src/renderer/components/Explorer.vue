<template>
    <el-container style="width: 100%;height: 100%">
        <el-aside width="200px" style="height: 100%">
            <el-menu style="height: 100%;z-index: 2020;">
                <el-menu-item :index="dir" v-for="dir in dirs" :key="dir" @click.right.native="itemRightClick(dir, 'dir')" @click.native="dirSelect(dir)">
                    <span slot="title">{{ dir }}</span>
                </el-menu-item>
            </el-menu>
        </el-aside>
        <el-main style="padding: 0;">
            <div style="width: 100%;height: 40px;position: fixed">
                <el-input v-model="to.path" @keydown.enter.native="toDir">
                    <template slot=prepend>
                        <el-button icon="el-icon-back" @click="back"></el-button>
                    </template>
                </el-input>
            </div>
            <div style="margin-top: 60px">
                <el-card class="file" v-for="file in files" :key="file" :body-style="{padding: '2px'}" @click.right.native="itemRightClick(file, 'file')">
                    <div class="preview" @click="openFile(file)">
                        <i v-if="! $u.isImg(file)" class="el-icon-document" style="font-size: 50px;line-height: 80px;"></i>
                        <img v-if="$u.isImg(file)" :src="cd + (cd.endsWith('/') ? '' : '/') + file" />
                    </div>
                    <el-divider></el-divider>
                    <div class="file-name">
                        <p>{{ file }}</p>
                    </div>
                </el-card>
            </div>
        </el-main>

        <el-dialog width="style.width - 400 + 'px'" :top="style.height * 0.1 + 'px'" :visible.sync="show.folder">
            <div :style="{height: style.height * 0.6 + 'px'}">
                <div style="height: 80%;">
                    <draggable v-model="folders" @start="drag.folder = true" @end="folderDragEnd" animation="200">
                        <div class="folder" v-for="folder in folders" :key="folder" @click.right="folderRightClick(folder)">
                            <el-popover placement="bottom" trigger="hover" :content="folder" :open-delay="1000">
                                <div slot="reference" @click=move(folder)>{{ $pa.basename(folder) }}</div>
                            </el-popover>
                        </div>
                    </draggable>
                </div>
                <div style="height: 20%;border-top: 1px solid lightgray">
                    <div style="width: 100%;height: 30px;line-height: 30px;text-align: center;">{{ select.dir ? select.dir : select.file }}</div>
                    <el-button icon="el-icon-plus" @click="addFolder" size="small"></el-button>
                    <el-button icon="el-icon-house" @click="setDefaultFolder" size="small"></el-button>
                    <el-button :icon="edit.folder ? 'el-icon-close' : 'el-icon-edit'" @click="edit.folder = !edit.folder" size="small"></el-button>
                </div>
            </div>
        </el-dialog>

        <el-drawer :visible.sync="show.dirPreview" direction="rtl" :modal="false" :size="style.width - 300 + 'px'" :show-close="false">
            <div style="width: 100%;height: 100%;overflow: scroll;">
                <div class="dir-preview" v-for="item in preview.dirChildren" :key="item.name"  @click="openFileReal(item.name)">
                    <p v-if="! item.img">{{ $pa.basename(item.name) }}</p>
                    <img v-if="item.img" :src="item.name" />
                </div>
            </div>
        </el-drawer>

    </el-container>
</template>

<script>
    import fs from 'fs'
    import path from 'path'
    import util from './utils/util'
    import { remote, shell } from 'electron'
    import draggable from 'vuedraggable'
    import mv from 'mv'
    export default {
        data() {
            return {
                dirs: [],
                folders: [],
                files: [],
                cd: '',
                to: {
                    path: '',
                },
                show: {
                    folder: false,
                    dirPreview: false
                },
                style: {
                    width: 0,
                    height: 0,
                },
                select: {
                    dir: '',
                    file: '',
                },
                drag: {
                    folder: false
                },
                click: {
                    dirSelect: 0,
                },
                timer: {
                    dirSelect: null,
                },
                preview: {
                    dir: '',
                    dirChildren: [],
                },
                edit: {
                    folder: false,
                }
            }
        },
        components: {
            draggable,
        },
        mounted() {
            this.cd = util.getDefaultFolder()
            this.chdir(this.cd, true)
            this.folders = util.getFolders()
            let setSize = () => {
                let size = remote.getCurrentWindow().getSize()
                this.style.width = size[0]
                this.style.height = size[1]
            }
            setSize()
            remote.getCurrentWindow().addListener('resize', () => { setSize() })
            
        },
        methods: {
            chdir(dir, real = false) {
                if (! real) {
                    dir = this.cd + (this.cd.endsWith('/') ? '' : '/') + (dir == '/' ? '' : dir)
                }
                dir = dir.endsWith(':') ? (dir + '/') : dir
                if (!fs.existsSync(dir)) {
                    alert('dir not found')
                    return
                }
                if (!fs.statSync(dir).isDirectory()) {
                    alert('path is file')
                    return
                }
                this.to.path = this.cd = dir
                let items = fs.readdirSync(this.cd)
                let files = []
                let dirs = []
                items.forEach(f => {
                    try {
                        let stat = fs.statSync(this.cd + (this.cd.endsWith('/') ? '' : '/') + f)
                        if (stat.isFile()) {
                            files.push(f)
                        }
                        if (stat.isDirectory()) {
                            dirs.push(f)
                        }
                    } catch (e) {}
                })
                this.files = files
                this.dirs = dirs
            },
            back() {
                let pieces = this.cd.split('/')
                if (pieces.length == 1) {
                    return
                }
                let path = pieces.slice(0, pieces.length - 1).join('/')
                this.chdir(path, true)
            },
            toDir() {
                this.chdir(this.to.path, true)
            },
            dirSelect(dir) {
                let needPreview = true
                if (this.show.dirPreview) {
                    needPreview = false
                    this.dirPreview(dir)
                }
                
                if (this.click.dirSelect == 0) {
                    this.click.dirSelect++
                    if (! this.timer.dirSelect) {
                        this.timer.dirSelect = setTimeout(() => {
                            if (this.click.dirSelect == 1) {
                                this.click.dirSelect = 0
                                this.timer.dirSelect = null
                                if (needPreview) {
                                    this.dirPreview(dir)
                                }
                            }
                        }, 400)
                    }
                } else if (this.click.dirSelect >= 1) {
                    this.show.dirPreview = false
                    clearTimeout(this.timer.dirSelect)
                    this.timer.dirSelect = null
                    this.click.dirSelect = 0
                    this.chdir(dir)
                }
            },
            addFolder() {
                let folder = this.select.dir ? this.select.dir : this.cd
                this.$prompt('path to add (default ' + folder + ' )' ).then(({value}) =>  {
                    value = value ? value : folder
                    value = value.split('\\').join('/')
                    if (util.addFolder(value)) {
                        this.folders.push(value)
                    } else {
                        alert(util.errMsg())
                        this.addFolder()
                    }
                }).catch(() => {})
            },
            itemRightClick(item, type) {
                item = this.cd + (this.cd.endsWith('/') ? '' : '/') + item
                this.show.folder = true
                this.select.dir = this.select.file = ''
                type == 'dir' ? this.select.dir = item : this.select.file = item
            },
            folderRightClick(folder) {
                this.$confirm('confirm to delete ' + folder).then(() => {
                    util.delFolder(folder)
                    this.folders = this.folders.filter(f => f != folder)
                }).catch(() => {})
            },
            folderDragEnd() {
                this.drag.folder = false
                if (!util.setFolders(this.folders)) {
                    alert(util.errMsg())
                }
            },
            dirPreview(dir) {
                dir = this.cd + (this.cd.endsWith('/') ? '' : '/') + dir
                this.preview.dir = dir
                this.show.dirPreview = true
                this.preview.dirChildren = util.prevewDir(dir)
            },
            openFile(file) {
                file = this.cd + (this.cd.endsWith('/') ? '' : '/') + file
                shell.openItem(file)
            },
            openFileReal(file) {
                shell.openItem(file)
            },
            setDefaultFolder() {
                let folder = this.select.dir ? this.select.dir : this.cd
                this.$prompt('default folder to set (default ' + folder + ' )' ).then(({value}) =>  {
                    value = value ? value : folder
                    value = value.split('\\').join('/')
                    if (! util.setDefaultFolder(value)) {
                        alert(util.errMsg())
                        this.setDefaultFolder()   
                    }
                }).catch(() => {})
            },
            move(folder) {
                if (this.edit.folder) {
                    return
                }
                let old = this.select.dir ? this.select.dir : this.select.file
                if (this.select.dir) {
                    this.dirs = this.dirs.filter(d => d != path.basename(this.select.dir))
                }
                if (this.select.file) {
                    this.files = this.files.filter(d => d != path.bsaename(this.select.file))
                }
                // fs.renameSync(old, folder + (folder.endsWith('/') ? '' : '/') + path.basename(old))
                mv(old, folder + (folder.endsWith('/') ? '' : '/') + path.basename(old), { mkdirp: true }, err => {
                    if (!err) {
                        this.show.folder = false
                        this.select.dir = this.select.file = ''
                    } else {
                        alert(err)
                    }
                })
                
            }
        },
    }
</script>

<style scoped>
    .file {
        display: inline-block;
        width: 130px;
        height: 110px;
        margin: 10px;
    }

    .file .preview {
        width: 100%;
        height: 75px;
        text-align: center;
        user-select: none;
        cursor: pointer;
    }

    .file .el-divider--horizontal {
        margin: 5px;
    }

    .file-name {
        overflow-x: scroll;
        overflow-y: hidden;
    }

    .file-name p {
        width: max-content;
    }

    .file .preview img {
        object-fit: contain;
        width: 100%;
        height: 75px;
    }

    .folder {
        width: 60px;
        height: 30px;
        border: 1px solid lightgray;
        padding: 5px;
        border-radius: 5px;
        user-select: none;
        cursor: pointer;
        line-height: 30px;
        overflow: hidden;
        text-align: center;
        display: inline-block;
        margin: 2px;
    }

    .dir-preview {
        width: 200px;
        height: 200px;
        display:inline-block;
        border: 1px solid lightgray;
        border-radius: 5px;
        margin: 5px;
        text-align: center;
        user-select: none;
        cursor: pointer;
    }

    .dir-preview p {
        line-height: 200px;
    }

    .dir-preview img {
        width: 200px;
        height: 200px;
        object-fit: contain;
    }

    ::-webkit-scrollbar {
        width: 3px;
    }

    ::-webkit-scrollbar-thumb:window-inactive,
    ::-webkit-scrollbar-thumb {
        background: lightgray
    }
</style>