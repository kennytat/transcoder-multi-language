import { Component, NgZone, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Apollo } from 'apollo-angular';
import * as type from 'libs/xplat/core/src/lib/services/graphql.types';
import { DataService } from '@vgm-converter/xplat/core';
import * as _ from 'lodash';
import * as path from 'path'
import * as pinyin from 'chinese-to-pinyin';
interface SelectedTopic {
  level: number,
  id: string,
  name?: string,
  createGQL?: any,
  updateGQL?: any,
  options: any[]
}
@Component({
  selector: 'vgm-converter',
  templateUrl: 'converter.page.html',
  styleUrls: ['converter.page.scss'],
})
export class ConverterPage implements OnInit {
  isVideo: boolean = true;
  level1: SelectedTopic = {
    level: 1, id: '0', options: [
      { name: 'videoDB', id: '00000000-0000-0000-0000-000000000001', location: '/VGMV', url: '' },
      { name: 'audioDB', id: '00000000-0000-0000-0000-000000000002', location: '/VGMA', url: '' }
    ]
  }
  level2: SelectedTopic = { level: 2, id: '0', createGQL: type.CREATE_LEVEL_2, updateGQL: type.UPDATE_LEVEL_2, options: [] }
  level3: SelectedTopic = { level: 3, id: '0', createGQL: type.CREATE_LEVEL_3, updateGQL: type.UPDATE_LEVEL_3, options: [] }
  level4: SelectedTopic = { level: 4, id: '0', createGQL: type.CREATE_LEVEL_4, updateGQL: type.UPDATE_LEVEL_4, options: [] }
  level5: SelectedTopic = { level: 5, id: '0', createGQL: type.CREATE_LEVEL_5, updateGQL: type.UPDATE_LEVEL_5, options: [] }
  level6: SelectedTopic = { level: 6, id: '0', createGQL: type.CREATE_LEVEL_6, updateGQL: type.UPDATE_LEVEL_6, options: [] }
  selectedTopics = [this.level1, this.level2, this.level3, this.level4, this.level5, this.level6]
  selectedItem: any;
  selectedLevel: string = '0';
  // Declare variable for conversion feature
  inputPath: string | string[] = '';
  outputPath: string | string[] = '';
  fileCheckbox: boolean;
  isConverting: boolean = false;
  progressLoading: boolean = false;
  progressionStatus: number = 0;
  convertedFiles: number = 0;
  totalFiles: number = 0;
  // instance for adding db manually
  path = '';
  level: number = 0;
  newDBArray = [];

  constructor(
    private _electronService: ElectronService,
    private zone: NgZone,
    private apollo: Apollo,
    private dataService: DataService) {

  }


  ngOnInit() {
    // create large db instant code start
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.on('create-manual', async (event, listArray) => {
        this.newDBArray = [];
        if (this.selectedItem.name === 'Audio' || this.selectedItem.name === 'Video') {
          this.selectedItem.url = '';
        }
        this.newDBArray.push(this.selectedItem);
        console.log(listArray, this.newDBArray);
        let i = 0;
        while (i < listArray.length) {
          if (!listArray[i].pName) {
            listArray[i].pName = this.selectedItem.name;
            listArray[i].pid = this.selectedItem.id;
          }
          const pIndex = this.newDBArray.findIndex(item => path.basename(listArray[i].pName) === item.name);
          if (pIndex >= 0) {
            console.log('found pItem', this.newDBArray[pIndex], listArray[i].pName);
            const newItem = await this.createMass(listArray[i].name, this.newDBArray[pIndex]);
            this.newDBArray.push(newItem);
            if (newItem) {
              i++
            }
          } else {
            console.log('pItem not found', listArray[i], this.newDBArray);
            i++;
          }
        }
      })
    }
    // create large db instant code end
  }


  async selectOptionChange(level, itemID) {
    this.selectedLevel = level;
    if (itemID === this.level1.options[0].id) {
      this.isVideo = true;
    } else if (itemID === this.level1.options[1].id) {
      this.isVideo = false;
    }
    console.log(level, itemID);

    if (itemID === '0') {
      this.selectedTopics[level - 1].id = '0';
    } else if (itemID === '1') {
      this.selectedTopics[level - 1].id = '1';
    } else {
      this.selectedTopics[level - 1].id = itemID;
      this.selectedTopics[level].id = '0';
      this.selectedTopics[level].options = [];
      const options: any = await this.getOptions(level, this.isVideo, itemID);
      if (typeof options[0] != 'undefined') {
        this.selectedItem = _.cloneDeep(options[0]);
      } else {
        this.selectedItem = _.cloneDeep(options);
      };
      if (this.selectedItem.children && this.selectedItem.children.length > 0 && this.selectedItem.isLeaf === false) {
        this.selectedTopics[level].options = this.selectedItem.children;
      }
      console.log('selected', this.selectedItem, this.selectedTopics[level]);
    }

  }

  async getOptions(level, isVideo, id) {
    return new Promise(async (resolve) => {
      const result = await this.dataService.fetchLevelDB(level, isVideo, undefined, id);
      console.log('getoption', result);

      resolve(result);
    });
  }


  async createNewTopic(level, value) {
    const pid = this.selectedTopics[level - 2].id;
    const gql = this.selectedTopics[level - 1].createGQL;
    const nonVietnamese = await this.nonAccentVietnamese(value);
    const pList = [...this.selectedTopics[level - 2].options];
    const [pItem] = pList.filter((item) => item.id.includes(pid));
    // console.log('parent', pid, pItem, pList);

    this.selectedTopics[level - 1].name = '';
    await this.apollo.mutate<any>({
      mutation: gql,
      variables: {
        pid: pid,
        isLeaf: false,
        location: `${pItem.location}/${nonVietnamese.replace(/\s/g, '')}`,
        url: pItem.url.concat('.', nonVietnamese.toLowerCase().replace(/[\W\_]/g, '-')).replace(/^\.|\.$/g, '').replace(/-+-/g, "-"),
        isVideo: pItem.isVideo,
        name: value,
      }
    }).subscribe(async ({ data }) => {
      const result = data[Object.keys(data)[0]];
      this.selectedItem = await _.cloneDeep(result);
      await this.selectedTopics[level - 1].options.push(this.selectedItem);
      await this.selectOptionChange(level, this.selectedItem.id);
      console.log(this.selectedItem);
    }, (error) => {
      console.log('there was an error sending the query', error);
      if (this._electronService.isElectronApp) {
        this._electronService.ipcRenderer.invoke('error-message', 'topic-db-error');
      }
    });
  }

  async createMass(itemName, pItem) {
    return new Promise<string>(async (resolve, reject) => {
      const gql = this.selectedTopics[pItem.dblevel + 1 - 1].createGQL;
      const nonVietnamese = await this.nonAccentVietnamese(itemName);
      const nonChinese = await pinyin(nonVietnamese, { removeTone: true, keepRest: true }); // this line for non Chinese characters
      await this.apollo.mutate<any>({
        mutation: gql,
        variables: {
          pid: pItem.id,
          isLeaf: false,
          location: `${pItem.location}/${nonChinese.replace(/\s/g, '')}`,
          url: pItem.url.concat('.', nonChinese.toLowerCase().replace(/[\W\_]/g, '-')).replace(/^\.|\.$/g, '').replace(/-+-/g, "-"),
          isVideo: pItem.isVideo,
          name: itemName,
        }
      }).subscribe(async ({ data }) => {
        const result = await _.cloneDeep(data[Object.keys(data)[0]]);
        resolve(result);
      }, (error) => {
        console.log('there was an error sending the query', error);
      });
    })
  }

  updateLeaf() {
    const item = { id: this.path, dblevel: this.level }
    this.updateIsLeaf(item, 0)
  }

  updateIsLeaf(item, count) {
    this.apollo.mutate<any>({
      mutation: this.selectedTopics[item.dblevel - 1].updateGQL,
      variables: {
        id: item.id,
        isLeaf: true,
        count: count
      }
    }).subscribe(({ data }) => {
      console.log(data);
    }, (error) => {
      console.log('error updating isLeaf', error);
    });
  }

  nonAccentVietnamese(str) {
    //     We can also use this instead of from line 11 to line 17
    //     str = str.replace(/\u00E0|\u00E1|\u1EA1|\u1EA3|\u00E3|\u00E2|\u1EA7|\u1EA5|\u1EAD|\u1EA9|\u1EAB|\u0103|\u1EB1|\u1EAF|\u1EB7|\u1EB3|\u1EB5/g, "a");
    //     str = str.replace(/\u00E8|\u00E9|\u1EB9|\u1EBB|\u1EBD|\u00EA|\u1EC1|\u1EBF|\u1EC7|\u1EC3|\u1EC5/g, "e");
    //     str = str.replace(/\u00EC|\u00ED|\u1ECB|\u1EC9|\u0129/g, "i");
    //     str = str.replace(/\u00F2|\u00F3|\u1ECD|\u1ECF|\u00F5|\u00F4|\u1ED3|\u1ED1|\u1ED9|\u1ED5|\u1ED7|\u01A1|\u1EDD|\u1EDB|\u1EE3|\u1EDF|\u1EE1/g, "o");
    //     str = str.replace(/\u00F9|\u00FA|\u1EE5|\u1EE7|\u0169|\u01B0|\u1EEB|\u1EE9|\u1EF1|\u1EED|\u1EEF/g, "u");
    //     str = str.replace(/\u1EF3|\u00FD|\u1EF5|\u1EF7|\u1EF9/g, "y");
    //     str = str.replace(/\u0111/g, "d");
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/ƀ/g, "b");
    str = str.replace(/č/g, "c");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ĕ|ê|ề|ế|ệ|ể|ễ|ê̆/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ|ĭ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ŏ|ô|ồ|ố|ộ|ổ|ỗ|ô̆|ơ|ờ|ớ|ợ|ở|ỡ|ơ̆/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ŭ|ư|ừ|ứ|ự|ử|ữ|ư̆/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/ñ/g, "n");

    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/Ƀ/g, "B");
    str = str.replace(/Č/g, "C");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ĕ|Ê̆|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ|Ĭ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ|Ŏ|Ơ̆|Ô̆/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ŭ|Ư|Ừ|Ứ|Ự|Ử|Ữ|Ư̆/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ|Ð/g, "D");
    str = str.replace(/Ñ/g, "N");
    // Some system encode vietnamese combining accent as individual utf-8 characters
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // Huyền sắc hỏi ngã nặng 
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // Â, Ê, Ă, Ơ, Ư
    // str = str.replace(/-+-/g, "-"); //thay thế 2- thành 1- 
    return str;
  }

  async test() {
    // const testItem = await this.getOptions(1, true, '00000000-0000-0000-0000-000000000001'); // 00000000-0000-0000-0000-000000000001 3c99cef1-0b91-4cff-a01b-2aa3cc0ca1d4
    // console.log(testItem);
    // const item = await this.dataService.fetchLevelDB(1, true, false);
    // console.log('got itemmmmmm', item);

    console.log(this.path, this.level);
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.send('instance-db', this.path); // isVideo??
    }

    // this.updateIsLeaf();
    // console.log(this.level1.options, '\n', this.level2.options, '\n', this.level3.options, '\n', this.level4.options, '\n', this.level5.options);
    //     const data = `/home/kennytat/Downloads/bigbig/BigBuck.mp4
    // /home/kennytat/Downloads/bigbig/Bigbig-123.mp4`
    //     console.log(data.split("\n"));


    //   console.log(this.level1.options, this.level2.options, this.level3.options, this.level4.options);

    // createDB(raw) {

    // if (this._electronService.isElectronApp) {
    //   this._electronService.ipcRenderer.invoke('test');
    // }
    // this.apollo.mutate<any>({
    //   mutation: type.CREATE_LEVEL_2,
    //   variables: {
    //     pid: "00000000-0000-0000-0000-000000000001",
    //     isLeaf: true,
    //     location: "asdfasdf234",
    //     url: "data.url",
    //     isVideo: false,
    //     name: "data 05 moto",
    //   }
    // }).subscribe(({ data }) => {
    //   console.log('got data', data);
    //   console.log(data.createLevel2.id);
    //   console.log(videoDB);
    // }, (error) => {

    //   console.log('there was an error sending the query', error);
    // });





    //   const files = raw.replace(/}[\n,\s]+?{/g, '}splitjson{').split('splitjson');
    //   files.forEach(item => {
    //     const file = JSON.parse(item);
    //     const fileName = file.format.filename.replace(/^(.*[\\\/])/, '');
    //     const originalPath = file.format.filename.replace(/([^\/]+$)/, '');
    //     const fileThumb = this.outputPath.concat('/', fileName, '/', 'Thumb_720p/01.jpg');

    //     // console.log(file.format.filename);
    //     // console.log(file.format.duration);
    //     // console.log(file.format.size);
    //     // console.log(fileName);
    //     // console.log(originalPath);
    //     // console.log(fileThumb);


    //     this.apollo.mutate<CreateContentResult>({
    //       mutation: CREATE_CONTENT,
    //       variables: {
    //         contentName: fileName,
    //         contentPid: this.selectedTopicID,
    //         contentDuration: file.format.duration,
    //         contentSize: file.format.size,
    //         contentOrigin: originalPath,
    //         contentFolder: this.outputPath,
    //         contentThumb: fileThumb,
    //         contentType: 'video'
    //       },
    //     }).subscribe(({ data }) => { console.log(data); }, (error) => {
    //       console.log('error creating new entries', error);
    //     });

    //   });
    // }
  }


  OpenDialog() {
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.invoke('open-dialog', this.fileCheckbox).then((inpath) => {
        // console.log(inpath);
        this.zone.run(() => {
          this.inputPath = inpath;
        })
      })
    }
  }

  SaveDialog() {
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.invoke('save-dialog').then((outpath) => {
        this.zone.run(() => {
          this.outputPath = outpath.toString();
        })
      })
    }
  }


  Convert() {
    if (this._electronService.isElectronApp) {
      if (!this.inputPath || !this.outputPath || !this.selectedItem) {
        this._electronService.ipcRenderer.invoke('error-message', 'missing-path');
      } else {

        this.isConverting = true;
        this._electronService.ipcRenderer.invoke('start-convert', this.inputPath, this.outputPath, this.fileCheckbox, this.selectedItem);
        this._electronService.ipcRenderer.on('exec-done', (event) => {
          this.zone.run(() => {
            // this.updateIsLeaf(this.selectedItem, this.totalFiles);
            this.isConverting = false;
            this.progressLoading = false;
            this.progressionStatus = 0;
            this.outputPath = '';
            this.inputPath = '';
            // this.dataService.dbRefresh(this.isVideo);
          });
        });

        this._electronService.ipcRenderer.on('progression', (event, arg1, arg2, arg3) => {
          this.zone.run(() => {
            this.progressionStatus = arg1;
            this.convertedFiles = arg2;
            this.totalFiles = arg3;
            if (this.progressionStatus > 0.99) {
              this.progressLoading = true;
            } else {
              this.progressLoading = false;
            }
          });
        });
      };
    }
  }

  Cancel() {
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.invoke('stop-convert').then((response) => {
        this.zone.run(() => {
          this.isConverting = false;
          this.inputPath = '';
          this.outputPath = '';
          this.dataService.dbRefresh(this.isVideo);
        })
      })
    }
  }

}