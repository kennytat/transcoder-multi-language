import { Component, Injectable, NgZone, OnInit, SimpleChanges } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ElectronService } from 'ngx-electron';
import { Subscription } from 'rxjs';
import { TreeviewItem, TreeviewConfig } from 'ngx-treeview';
import CryptoJS from "crypto-js";
import { slice } from 'ramda';
import * as type from 'libs/xplat/core/src/lib/services/graphql.types';
import { DataService } from '@vgm-converter/xplat/core';
import * as _ from 'lodash';
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: 'http://search.hjm.bid', // 'http://search.hjm.bid'
  apiKey: '', // 'KYV2oMHSE5G2p9ZXwUGH3CfWpaXB1CF5'
})

interface FileInfo {
  pid: string,
  location: string,
  name: string,
  size: number,
  duration: string,
  qm: string,
  url: string,
  hash: string,
  isVideo: boolean,
  dblevel: number
}
@Component({
  selector: 'vgm-database',
  templateUrl: 'database.page.html',
  styleUrls: ['database.page.scss'],
})
@Injectable({
  providedIn: 'root',
})
export class DatabasePage implements OnInit {
  createGQL: any[] = [
    type.CREATE_LEVEL_2,
    type.CREATE_LEVEL_3,
    type.CREATE_LEVEL_4,
    type.CREATE_LEVEL_5,
    type.CREATE_LEVEL_6,
    type.CREATE_LEVEL_7,
  ];
  updateGQL: any[] = [
    type.UPDATE_LEVEL_2,
    type.UPDATE_LEVEL_3,
    type.UPDATE_LEVEL_4,
    type.UPDATE_LEVEL_5,
    type.UPDATE_LEVEL_6,
    type.UPDATE_LEVEL_7,
  ]
  deleteGQL: any[] = [
    type.DELETE_LEVEL_2,
    type.DELETE_LEVEL_3,
    type.DELETE_LEVEL_4,
    type.DELETE_LEVEL_5,
    type.DELETE_LEVEL_6,
    type.DELETE_LEVEL_7,
  ]

  private videoDBSub: Subscription
  private audioDBSub: Subscription
  private videoTreeSub: Subscription
  private audioTreeSub: Subscription
  _dbInit = false;
  _searchInit = false;
  meiliSearch: any;
  // Declare variable for videoDB and audioDB seperately
  isVideo = true;
  // Declare variable and setting for mapping GQL data to ngx-Tree
  videoTree: TreeviewItem[];
  videoFiles: any = [];
  videoItemList: any[] = [];
  videoTopicList: any[] = [];
  // audioDB: any[] | null = null;
  audioTree: TreeviewItem[];
  audioFiles: any = [];
  audioItemList: any[] = [];
  audioTopicList: any[] = [];

  selectedFilesID = [];
  selectedFileInfo: any[] = [];
  selectedFileCount: number = 0;
  // treeview config
  config = TreeviewConfig.create({
    hasFilter: true,
    hasCollapseExpand: true,
    hasAllCheckBox: true,
    decoupleChildFromParent: false
  });

  // Declare output filter && button
  mainFn = true;
  editFn = false;
  nameFilter = true;
  pathFilter = true;
  publishFilter = true;
  metaFilter = true;

  constructor(
    private _electronService: ElectronService,
    private zone: NgZone,
    private apollo: Apollo,
    private dataService: DataService) {

    // this.videoDBSub = this.dataService.videoDB$.subscribe((data) => {
    //   if (data[0]) {
    //     this.videoFiles = this.getAllItem(true);
    //   }
    // });

    // this.audioDBSub = this.dataService.audioDB$.subscribe((data) => {
    //   if (data[0]) {
    //     this.audioFiles = this.getAllItem(false);
    //   }
    // });

    this.videoTreeSub = this.dataService.videoTree$.subscribe(async (data) => {
      if (data.value) {
        this.videoTree = [new TreeviewItem(data)];
        this.videoFiles = await this.getAllDB(true, null);
        console.log(this.videoTree);
      }
    });

    this.audioTreeSub = this.dataService.audioTree$.subscribe(async (data) => {
      if (data.value) {
        this.audioTree = [new TreeviewItem(data)];
        this.audioFiles = await this.getAllDB(false, null);
        console.log(data, this.audioTree);
      }
    });

    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.on('create-database', async (event, fileInfo) => {
        console.log('createDB called', fileInfo);
        await this.createNewItem(fileInfo);
        // this.updateIsLeaf(fileInfo);

      })
      this._electronService.ipcRenderer.on('update-ipfs', async (event, fileInfo) => {
        // console.log('update IPFS Hash called', fileInfo);
        const variables = {
          id: fileInfo.id,
          hash: fileInfo.hash,
          qm: fileInfo.qm,
        };
        await this.updateSingle(fileInfo.dblevel, variables);
      })
      this._electronService.ipcRenderer.on('update-count', async (event, fileInfo) => {
        console.log('update count called', fileInfo);
        const variables = {
          id: fileInfo.id,
          count: fileInfo.count
        };
        await this.updateSingle(fileInfo.dblevel, variables);
      })
    }
  }

  showDiv(divVal: string) {
    if (divVal === 'V') {
      this.isVideo = true;
    } else {
      this.isVideo = false;
    }
  }
  // Run function OnInit
  async ngOnInit() {
    try {
      await this.dataService.dbInit();
      this._dbInit = this.dataService._dbInit;
      // this.connectSearch();
    } catch (error) {
      console.log(error);
    }

  }

  ngOnDestroy(): void {
    (this.videoDBSub, this.audioDBSub, this.videoTreeSub, this.audioTreeSub as Subscription).unsubscribe();
  }


  async createNewItem(item) {
    await this.apollo.mutate<any>({
      mutation: this.createGQL[item.dblevel - 2],
      variables: {
        pid: item.pid,
        isLeaf: null,
        location: item.location,
        url: item.url,
        isVideo: item.isVideo,
        name: item.name,
        qm: item.qm,
        hash: item.hash,
        duration: item.duration,
        size: item.size

      }
    }).subscribe(async ({ data }) => {
      console.log('created local DB', data);
      // this.addSearch([data[Object.keys(data)[0]]]);
      const result: any = data[Object.keys(data)[0]];
      const [pItem] = _.cloneDeep(await this.dataService.fetchLevelDB(result.dblevel - 1, result.isVideo, undefined, result.pid));
      console.log('pItem after create new:', pItem);
      const pItemCount = pItem.children.length + 1;
      const updateParentOption = {
        id: result.pid,
        isLeaf: true,
        count: pItemCount,
      };

      await this.updateSingle(pItem.dblevel, updateParentOption);
    }, (error) => {
      console.log('error creating new item', error);
    });

  }

  // async updateIsLeaf(item) {
  //   return new Promise(async (resolve) => {
  //     await this.apollo.mutate<any>({
  //       mutation: this.updateGQL[item.dblevel - 3],
  //       variables: {
  //         id: item.pid,
  //         isLeaf: true,
  //         count: 0
  //       },
  //       fetchPolicy: 'network-only',
  //     }).subscribe(({ data }) => {
  //       console.log(data);
  //       resolve('done');
  //     }, (error) => {
  //       console.log('error updating isLeaf', error);
  //     });
  //   })
  // }

  // async updateHash(item) {
  //   return new Promise((resolve) => {
  //     this.apollo.mutate<any>({
  //       mutation: this.updateGQL[item.dblevel - 2],
  //       variables: {
  //         id: item.id,
  //         hash: item.hash,
  //         qm: item.qm,
  //       },
  //       fetchPolicy: 'network-only',
  //     }).subscribe(({ data }) => {
  //       console.log(data);
  //       resolve('done');
  //     }, (error) => {
  //       console.log('error updating Hash', error);
  //     });
  //   })
  // }

  async updateSingle(dblevel, options) {
    return new Promise(async (resolve) => {
      await this.apollo.mutate<any>({
        mutation: this.updateGQL[dblevel - 2],
        variables: options,
        fetchPolicy: 'network-only',
      }).subscribe(({ data }) => {
        console.log(data);
        resolve('done');
      }, (error) => {
        console.log('error updating single item', error);
      });
    })
  }


  refreshDB() {
    this.dataService.dbRefresh(this.isVideo);
    this.connectSearch();
  }

  async connectSearch() {
    try {
      const indexes = await client.listIndexes();
      console.log('meiliSearch', indexes);
      if (indexes) {
        this.meiliSearch = client.index('VGMDB');
        this._searchInit = true;
      }
    } catch (error) {
      console.log(error);
    }
  }




  async test() {
    // const items: any = await this.getAllItem(this.isVideo);
    // console.log(items);
    // let i = 0;
    // while (i < items.length) {
    //   const result = await this.updateIsLeaf(items[i]);
    //   if (result) {
    //     i++
    //   }
    // }
    // try {
    //   const itemList: any = await this.getAllDB(this.isVideo, true);
    //   console.log('itemlist', itemList);
    //   const topicList: any = await this.getAllDB(this.isVideo, false);
    //   console.log('topiclist', topicList);
    //   const items: any = await this.getAllDB(this.isVideo, null);
    //   console.log('itemSingle', items);
    // } catch (error) {
    //   console.log(error);
    // }

    // test instant update item 
    // const item = {
    //   "dblevel": 4,
    //   "pid": "3d54f517-3db5-49e0-b786-b7d9a4796f9c",
    // }
    // await this.updateIsLeaf(item);


    // convert instance code
    if (this._electronService.isElectronApp) {
      // set prefixed local path to database folder, start vs end converting point for each machine. Ex: '/home/vgmuser/Desktop' 
      const prefixPath = '/home/vgm/Desktop';
      const startPoint = 0; // ipfs 299 file done
      const endPoint = 500;
      const fileType = 'audio';
      this._electronService.ipcRenderer.send('test', prefixPath, fileType, startPoint, endPoint); // 'test' 'fastly' 
      // this._electronService.ipcRenderer.send('cloud-to-ipfs', prefixPath, fileType, startPoint, endPoint);
      // this._electronService.ipcRenderer.send('get-count');
    }

    // const fileInfo = {
    //   pid: '193f4b25-1d46-4d15-8d87-d181de0a93bf',
    //   location: '/VGMV/01_BaiGiang/HocTheoChuDe/11-ThanLeThat-traiTN2017/01-DucThanhLinhCoNguTrongToiKhongP1',
    //   name: '01-Đức Thánh Linh Có Ngự Trong Tôi Không P1',
    //   size: 2258434926,
    //   duration: '76:44',
    //   qm: '',
    //   url: '01-bai-giang.hoc-theo-chu-de.11-than-le-that---trai-tn2017.01-duc-thanh-linh-co-ngu-trong-toi-khong-p1',
    //   hash: '',
    //   isVideo: true,
    //   dblevel: 5
    // }

    // this.updateIsLeaf(fileInfo);
    // this.createNewItem(fileInfo);
  }

  async exportAPI() {
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.invoke('save-dialog').then(async (outpath) => {
        if (outpath[0]) {
          // // export itemList
          const itemList: any = await this.getAllDB(this.isVideo, true);
          await itemList.forEach(async item => {
            await this._electronService.ipcRenderer.invoke('export-database', 'web', item, outpath, 'itemList');
          });
          // // export itemSingle
          const itemSingle: any = await this.getAllDB(this.isVideo, null);
          await itemSingle.forEach(async item => {
            await this._electronService.ipcRenderer.invoke('export-database', 'web', item, outpath, 'itemSingle')
          });
          // export topicList
          const nonLeafList: any = await this.getAllDB(this.isVideo, false);
          const topicList = nonLeafList.concat(itemList);
          await topicList.forEach(async item => {
            await this._electronService.ipcRenderer.invoke('export-database', 'web', item, outpath, 'topicList');
          });
          // export topicSingle
          await topicList.forEach(async item => {
            const topic = _.cloneDeep(item);
            delete topic.children;
            await this._electronService.ipcRenderer.invoke('export-database', 'web', topic, outpath, 'topicSingle');
          });
          // export searchAPI
          const searchList = itemSingle.filter(el => !/^(06-phim)/.test(el.url));
          await this._electronService.ipcRenderer.invoke('export-database', 'web', searchList, outpath, 'searchAPI', this.isVideo);
        }
      })
    }
  }

  async exportSpeakerAPI() {
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.invoke('save-dialog').then(async (outpath) => {
        if (outpath[0]) {
          // // export itemList
          const itemList: any = await this.getAllDB(this.isVideo, true);
          await itemList.forEach(async item => {
            const list = _.cloneDeep(item);
            const exportList = {
              id: list.id,
              name: list.name,
              url: list.url,
              isLeaf: list.isLeaf,
              list: list.children.map((item) => ({
                id: item.id,
                name: item.name,
                url: item.url,
                hash: item.hash
              }))
            }
            // console.log(exportList);
            await this._electronService.ipcRenderer.invoke('export-database', 'speaker', exportList, outpath, 'itemList');
          });
          // // export itemSingle
          const itemSingle: any = await this.getAllDB(this.isVideo, null);
          await itemSingle.forEach(async item => {
            const list = _.cloneDeep(item);
            const exportList = {
              id: list.id,
              name: list.name,
              url: list.url,
              hash: list.hash
            }
            await this._electronService.ipcRenderer.invoke('export-database', 'speaker', exportList, outpath, 'itemSingle')
          });
          // export topicList
          const nonLeafList: any = await this.getAllDB(this.isVideo, false);
          const topicList = nonLeafList.concat(itemList);
          await topicList.forEach(async item => {
            const list = _.cloneDeep(item);
            const exportList = {
              id: list.id,
              name: list.name,
              url: list.url,
              isLeaf: list.isLeaf,
              list: list.children.map((item) => ({
                id: item.id,
                name: item.name,
                url: item.url,
                isLeaf: item.isLeaf
              }))
            }
            await this._electronService.ipcRenderer.invoke('export-database', 'speaker', exportList, outpath, 'topicList');
          });
          // export topicSingle
          await topicList.forEach(async item => {
            const list = _.cloneDeep(item);
            const exportList = {
              id: list.id,
              name: list.name,
              url: list.url,
              isLeaf: list.isLeaf,
            }
            await this._electronService.ipcRenderer.invoke('export-database', 'speaker', exportList, outpath, 'topicSingle');
          });
        }
      })
    }
  }

  async getAllDB(isVideo, isLeaf) {
    return new Promise(async (resolve) => {
      let files: any[] = [];
      for (let i = 0; i < this.updateGQL.length; i++) {
        await this.dataService.fetchLevelDB(i + 1, isVideo, isLeaf).then((list) => {
          files = files.concat(list);
          if (i === this.updateGQL.length - 1) {
            resolve(files);
          }
        })
      }
    });
  }

  // async getAllItem(isVideo) {
  //   return new Promise(async (resolve) => {
  //     let files: any[] = [];
  //     for (let i = 0; i < this.updateGQL.length; i++) {
  //       await this.dataService.fetchLevelDB(i + 2, isVideo, null).then((list) => {
  //         files = files.concat(list);
  //         if (i === this.updateGQL.length - 1) {
  //           resolve(files);
  //         }
  //       })
  //     }
  //   });
  // }

  // async getAllIsLeaf(isVideo) {
  //   return new Promise(async (resolve) => {
  //     let files: any[] = [];
  //     for (let i = 0; i < this.updateGQL.length; i++) {
  //       await this.dataService.fetchLevelDB(i + 2, isVideo, true).then((list) => {
  //         // console.log(i, list);
  //         files = files.concat(list);
  //         if (i === this.updateGQL.length - 1) {
  //           // console.log(i);
  //           resolve(files);
  //         }
  //       })
  //     }
  //   });
  // }

  // async getAllNonLeaf(isVideo) {
  //   return new Promise(async (resolve) => {
  //     let files: any[] = [];
  //     for (let i = 0; i < this.updateGQL.length; i++) {
  //       await this.dataService.fetchLevelDB(i + 2, isVideo, false).then((list) => {
  //         files = files.concat(list);
  //         if (i === this.updateGQL.length - 1) {
  //           resolve(files);
  //         }
  //       })
  //     }
  //   });
  // }

  // async getAllIsLeaf(isVideo) {
  //   let lists: any[] = [];
  //   let db: any[];
  //   if (isVideo) {
  //     db = this.dataService.videoDB;
  //   } else {
  //     db = this.dataService.audioDB;
  //   }
  //   db.forEach(function getItem(item) {
  //     if (item.isLeaf === true) {
  //       lists.push(item);
  //     }
  //     if (item.children.length >= 1) {
  //       item.children.forEach(getItem)
  //     }
  //   });
  //   return lists;
  // }

  // getAllNonLeaf(isVideo) {
  //   let lists: any[] = [];
  //   let db: any[];
  //   if (isVideo) {
  //     db = this.dataService.videoDB
  //   } else {
  //     db = this.dataService.audioDB
  //   }

  //   db.forEach(function getItem(item) {
  //     if (item.isLeaf === false) {
  //       lists.push(item);
  //     }
  //     if (item.children.length >= 1) {
  //       item.children.filter(getItem)
  //     }
  //   });

  //   // lists.forEach((item) => {
  //   //   if (item.children[0]) {
  //   //     item.children.forEach(elem => {
  //   //       console.log(elem);

  //   //       // if (elem.children[0]) {
  //   //       //   elem.children = []
  //   //       // }
  //   //     });
  //   //   }
  //   // })
  //   return lists;
  // }

  treeSelectedChange(ids) {
    this.selectedFilesID = ids;
    this.selectedFileCount = this.selectedFilesID.length;
    if (this.selectedFileCount >= 1) {
      const v = this.videoFiles.filter(data => ids.includes(data.id));
      const a = this.audioFiles.filter(data => ids.includes(data.id));
      if (this.isVideo) {
        this.selectedFileInfo = v;
      } else {
        this.selectedFileInfo = a;
      }
    } else {
      this.selectedFileInfo = [];
    };
    console.log(this.selectedFilesID, this.selectedFileInfo)
  }

  treeFilterChange(event: string) {
    console.log('filter:', event);
  }

  checkFilter(value, check) {
    switch (value) {
      case 'nameFilter':
        this.nameFilter = check;
        break;
      case 'pathFilter':
        this.pathFilter = check;
        break;
      case 'publishFilter':
        this.publishFilter = check;
        break;
      case 'metaFilter':
        this.metaFilter = check;
        break;
      default:
        this.nameFilter = true;
        this.pathFilter = true;
        this.publishFilter = true;
        this.metaFilter = true;
    }
  }

  getThumbnail(hash, url) {
    const secretKey = slice(0, 32, `${url}gggggggggggggggggggggggggggggggg`);
    const decrypt = CryptoJS.AES.decrypt(hash, secretKey);
    const qm = decrypt.toString(CryptoJS.enc.Utf8);
    return `https://vn.gateway.vgm.tv/ipfs/${qm}/480/1.png` || ''
  }

  modifyDBBtn(value) {
    switch (value) {
      case 'edit':
        this.mainFn = false;
        this.editFn = true;
        break;
      case 'cancel':
        this.editFn = false;
        this.mainFn = true;
        break;
      default:
        this.editFn = false;
        this.mainFn = true;
    }
  }

  execDBConfirmation(method) {
    if (this._electronService.isElectronApp) {
      if (this.selectedFilesID[0]) {
        this._electronService.ipcRenderer.invoke('exec-db-confirmation', method).then((result) => {
          if (result.response !== 0) {
            if (result.method === 'updateDB') { this.updateDB(); }
            else if (result.method === 'deleteDB') { this.deleteDB(); }
          }
        })
      } else {
        this._electronService.ipcRenderer.invoke('error-message', 'empty-select');
      }
    }
  }

  updateDB() {
    console.log('function to update db');
    this.selectedFileInfo.forEach(item => {
      this.apollo.mutate<any>({
        mutation: this.updateGQL[item.dblevel - 2],
        variables: {
          id: item.id,
          isLeaf: item.isLeaf,
          count: item.count,
          location: item.location,
          name: item.name,
          url: item.url,
          keyword: item.keyword,
          hash: item.hash,
          audience: item.audience,
          mtime: item.mtime,
          viewCount: item.viewCount
        },
      }).subscribe(({ data }) => {
        const result = data[Object.keys(data)[0]];
        this.addSearch([result]);
        console.log('updated local DB', data);
      }, (error) => {
        console.log('error deleting files', error);
      });
    });
  }

  async deleteDB() {
    let selectedItem: any | null = null;
    this.selectedFilesID.forEach(async (fileID) => {
      console.log(fileID);

      for (let i = 0; i < this.updateGQL.length; i++) {
        const item = await this.dataService.fetchLevelDB(i + 2, this.isVideo, false, fileID);
        if (!selectedItem && item) {
          [selectedItem] = item;
        };
      }

      this.apollo.mutate<any>({
        mutation: this.deleteGQL[selectedItem.dblevel - 2],
        variables: { id: fileID },
      }).subscribe(async ({ data }) => {
        console.log('delete local DB', data);
        const result: any = data[Object.keys(data)[0]];
        const [pItem] = _.cloneDeep(await this.dataService.fetchLevelDB(result.dblevel - 1, result.isVideo, undefined, result.pid));
        console.log('pItem before delete:', pItem);
        const pItemCount = pItem.children.length - 1;
        const updateParentOption = {
          id: result.pid,
          count: pItemCount,
        };
        await this.updateSingle(pItem.dblevel, updateParentOption);
        // this.deleteSearch(fileID);
      }, (error) => {
        console.log('error deleting files', error);
      });
    });

    this.dataService.treeRefresh(this.isVideo);
    const execDoneMessage: string = `Total ${this.selectedFilesID.length} items has been deleted`;
    this.execDBDone(execDoneMessage);
  }

  uploadDB() {
    this.addSearch(this.selectedFileInfo);
    const execDoneMessage: string = `Total ${this.selectedFileInfo.length} items has been updated to blockchain`;
    this.execDBDone(execDoneMessage);
  }


  addSearch(list: any[]) {
    if (this.meiliSearch) {
      this.meiliSearch.addDocuments(list);
    }
  }

  deleteSearch(id: string) {
    if (this.meiliSearch) {
      this.meiliSearch.deleteDocument(id);
    }
  }


  // Show corresponding message when mutating db done
  execDBDone(message) {
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.invoke('exec-db-done', message);
      this.zone.run(() => {
        this.editFn = false;
        this.mainFn = true;
      });
    }
  }

}
