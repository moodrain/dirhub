<template>
    <el-container style="width: 100%;height: 100%">
        <el-aside width="200px" style="height: 100%">
            <el-menu style="height: 100%;z-index: 2020;">
                <el-menu-item :index="dir.base" v-for="dir in dirs" :key="dir.name" @click.right.native="itemRightClick(dir.name, 'dir')" @click.native="dirSelect(dir.name)">
                    <span slot="title" style="user-select: none">{{ dir.base }}</span>
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
            <div ref="fileContainer" style="height: 100%;overflow-y: scroll">
                <div style="margin-top: 60px;">
                    <el-card class="file" v-for="file in files" :key="file.name" :body-style="{padding: '2px'}" @click.right.native="itemRightClick(file.name, 'file')">
                        <div class="preview" @click="openFile(file.name)">
                            <i class="el-icon-document" style="font-size: 50px;line-height: 80px;"></i>
                        </div>
                        <el-divider></el-divider>
                        <div class="file-name">
                            <p>{{ file.base }}</p>
                        </div>
                    </el-card>
                </div>
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
                    <el-button icon="el-icon-view" size="small" @click="setPreviewSize"></el-button>
                </div>
            </div>
        </el-dialog>

        <el-drawer :visible.sync="show.dirPreview" direction="rtl" :modal="false" :size="style.width - 300 + 'px'" :show-close="false">
            <div ref="previewContainer" style="width: 100%;height: 100%;overflow-y: scroll;">
                <div class="dir-preview" :style="style.dirPreview" v-for="item in preview.dirChildren" :key="item.name"  @click="openFile(item.name)">
                    <p v-if="! item.img" :style="style.dirPreviewP">{{ $pa.basename(item.name) }}</p>
                    <el-image lazy v-if="item.img" :src="item.name" fit="contain" :style="style.dirPreview"></el-image>
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
                    dirPreview: {
                        width: '200px',
                        height: '200px',
                    },
                    dirPreviewP: {
                        'line-height': '200px',
                    }
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
                    size: 200,
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
            this.chdir(this.cd)
            this.folders = util.getFolders()
            this.preview.size = util.getPreviewSize()
            this.style.dirPreview.height = this.style.dirPreview.width = this.style.dirPreviewP['line-height'] = (this.preview.size + 'px')
            let setSize = () => {
                let size = remote.getCurrentWindow().getSize()
                this.style.width = size[0]
                this.style.height = size[1]
            }
            setSize()
            remote.getCurrentWindow().addListener('resize', () => { setSize() })
            
        },
        methods: {
            chdir(dir) {
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
                let items = util.scanDir(this.cd)
                this.files = items.filter(i => ! i.dir)
                this.dirs = items.filter(i => i.dir)
                this.$refs.fileContainer.scrollTop = 0
            },
            back() {
                let pieces = this.cd.split('/')
                if (pieces.length == 1) {
                    return
                }
                let path = pieces.slice(0, pieces.length - 1).join('/')
                this.chdir(path)
            },
            toDir() {
                this.chdir(this.to.path)
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
                this.show.dirPreview = false
                this.preview.dirChildren = []
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
                this.preview.dir = dir
                this.show.dirPreview = true
                this.preview.dirChildren = util.scanDir(dir)
                this.$nextTick(() => {
                    this.$refs.previewContainer.scrollTop = 0
                })
            },
            openFile(file) {
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
                let loading = this.$loading({ lock: true })
                mv(old, folder + (folder.endsWith('/') ? '' : '/') + path.basename(old), { mkdirp: true }, err => {
                    if (!err) {
                        if (this.select.dir) {
                            this.dirs = this.dirs.filter(d => d.base != path.basename(this.select.dir))
                        }
                        if (this.select.file) {
                            this.files = this.files.filter(d => d.base != path.bsaename(this.select.file))
                        }
                        this.show.folder = false
                        this.select.dir = this.select.file = ''
                    } else {
                        alert(err)
                    }
                    loading.close()
                })
            },
            setPreviewSize() {
                let size = this.preview.size
                this.$prompt('preview size to set (default ' + size + ' )' ).then(({value}) =>  {
                    value = !isNaN(value) ? value : size
                    this.preview.size = value
                    this.style.dirPreview.height = this.style.dirPreview.width = this.style.dirPreviewP['line-height'] = (this.preview.size + 'px')
                    if (! util.setPreviewSize(value)) {
                        alert(util.errMsg())
                        this.setPreviewSize()   
                    }
                }).catch(() => {})
            },
        }
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
        display:inline-block;
        border: 1px solid lightgray;
        border-radius: 5px;
        margin: 5px;
        text-align: center;
        user-select: none;
        cursor: pointer;
    }

    ::-webkit-scrollbar {
        width: 3px;
    }

    ::-webkit-scrollbar-thumb:window-inactive,
    ::-webkit-scrollbar-thumb {
        background: lightgray
    }
</style>