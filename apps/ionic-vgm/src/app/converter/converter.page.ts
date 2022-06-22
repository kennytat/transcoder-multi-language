import { Component, NgZone, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Apollo } from 'apollo-angular';
import * as type from 'libs/xplat/core/src/lib/services/graphql.types';
import { DataService } from '@vgm-converter/xplat/core';
import * as path from 'path'
import * as _ from 'lodash';
import CryptoJS from "crypto-js";
import { slice } from 'ramda';

import Pqueue from 'p-queue';
const queue = new Pqueue({ concurrency: 1 });

interface SelectedTopic {
	level: number,
	id: string,
	name?: string,
	createGQL?: any,
	updateGQL?: any,
	item: any
}
@Component({
	selector: 'vgm-converter',
	templateUrl: 'converter.page.html',
	styleUrls: ['converter.page.scss'],
})
export class ConverterPage implements OnInit {
	isVideo: boolean = true;
	level1: SelectedTopic = {
		level: 1, id: '0', item: {
			children: [
				{ name: 'videoDB', id: '00000000-0000-0000-0000-000000000001', location: '/VGMV', url: '' },
				{ name: 'audioDB', id: '00000000-0000-0000-0000-000000000002', location: '/VGMA', url: '' }
			]
		}
	}
	level2: SelectedTopic = { level: 2, id: '0', createGQL: type.CREATE_LEVEL_2, updateGQL: type.UPDATE_LEVEL_2, item: {} }
	level3: SelectedTopic = { level: 3, id: '0', createGQL: type.CREATE_LEVEL_3, updateGQL: type.UPDATE_LEVEL_3, item: {} }
	level4: SelectedTopic = { level: 4, id: '0', createGQL: type.CREATE_LEVEL_4, updateGQL: type.UPDATE_LEVEL_4, item: {} }
	level5: SelectedTopic = { level: 5, id: '0', createGQL: type.CREATE_LEVEL_5, updateGQL: type.UPDATE_LEVEL_5, item: {} }
	level6: SelectedTopic = { level: 6, id: '0', createGQL: type.CREATE_LEVEL_6, updateGQL: type.UPDATE_LEVEL_6, item: {} }
	level7: SelectedTopic = { level: 7, id: '0', createGQL: type.CREATE_LEVEL_7, updateGQL: type.UPDATE_LEVEL_7, item: {} }
	selectedTopics = [this.level1, this.level2, this.level3, this.level4, this.level5, this.level6, this.level7]
	selectedItem: any;
	selectedLevel: string = '0';
	// Declare variable for conversion feature
	inputPath: string | string[] = '';
	fileCheckbox: boolean;
	isConverting: boolean = false;
	progressLoading: boolean = false;
	progressionStatus: number = 0;
	convertedFiles: number = 0;
	totalFiles: number = 0;
	// instance for adding db manually
	updateID: string = '';
	updateURL: string = '';
	updateLevel: number = 0;
	isGPU = true;
	newDBArray = [];
	tasks: string[] = [];
	concurrency: string = "1";
	constructor(
		private _electronService: ElectronService,
		private zone: NgZone,
		private apollo: Apollo,
		private _dataService: DataService) {
		queue.on('idle', () => {
			console.log(`Queue is idle.  Size: ${queue.size}  Pending: ${queue.pending}`);
			// console.log('exec file done');
			// this.execDone();
			// this._electronService.ipcRenderer.invoke('popup-message', 'exec-done');
		});

		if (this._electronService.isElectronApp) {
			// reset state when exec done
			this._electronService.ipcRenderer.on('exec-done', (event) => {
				this.execDone();
			});
			// update state while converting
			this._electronService.ipcRenderer.on('progression', (event, progression) => {
				this.zone.run(() => {
					this.progressionStatus = progression;
					this.progressLoading = this.progressionStatus > 0.99 ? true : false;
				});
			});
		}
	}


	ngOnInit() { }


	async selectOptionChange(level, itemID) {
		this.selectedLevel = level;
		if (itemID === this.level1.item.children[0].id) {
			this.isVideo = true;
			this.concurrency = '1';
		} else if (itemID === this.level1.item.children[1].id) {
			this.isVideo = false;
			this.concurrency = '20';
		}
		this.selectedTopics[level - 1].id = itemID;
		if (level >= 1 && level < this.selectedTopics.length) {
			this.selectedTopics[level].id = '0';
			this.selectedTopics[level].item.children = [];
		}

		if (itemID !== '0' && itemID !== '1') {
			const options: any = await this.getOptions(level, this.isVideo, undefined, itemID);
			if (typeof options[0] != 'undefined') {
				this.selectedItem = _.cloneDeep(options[0]);
			} else {
				this.selectedItem = _.cloneDeep(options);
			};
			if (this.selectedItem.isLeaf) {
				this.selectedItem.children = [];
				this.selectedTopics[level].id = '0';
			};
			this.selectedTopics[level].item = this.selectedItem;

			if (this.selectedItem.children && this.selectedItem.children.length > 0) {
				this.selectedTopics[level].id = '1';
			}

		} else {
			this.selectedItem = this.selectedTopics[level - 1].item;
			this.selectedTopics[level].id = itemID;
		}

		console.log(level, itemID);
		console.log('selected Topic -1 :', this.selectedTopics[level - 1]);
		console.log('selected Topic:', level, this.selectedTopics[level]);
		console.log('selected Item:', this.selectedItem);

	}


	async getOptions(level: number, isVideo = undefined, isLeaf = undefined, id = undefined, url = undefined) {
		return new Promise(async (resolve) => {
			const result = await this._dataService.fetchLevelDB(level, isVideo, isLeaf, id, url);
			console.log('getoption', result);
			resolve(result);
		});
	}


	async createNewTopic(level, value) {
		return new Promise<string>(async (resolve, reject) => {
			const pid = this.selectedTopics[level - 2].id;
			const gql = this.selectedTopics[level - 1].createGQL;
			const pureLatin = await this.langToLatin(value);
			const pList = [...this.selectedTopics[level - 2].item.children];
			const [pItem] = pList.filter((item) => item.id.includes(pid));
			const url = pItem.url.concat('.', pureLatin.toLowerCase().replace(/[\W\_]/g, '-')).replace(/^\.|\.$/g, '').replace(/-+-/g, "-");
			// console.log('parent', pid, pItem, pList);
			this.selectedTopics[level - 1].name = '';
			await this.apollo.mutate<any>({
				mutation: gql,
				variables: {
					pid: pid,
					isLeaf: false,
					url: url,
					isVideo: this.isVideo,
					name: value,
				}
			}).subscribe(async ({ data }) => {
				const result = data[Object.keys(data)[0]];
				// update parent count
				const [pItem] = _.cloneDeep(await this._dataService.fetchLevelDB(result.dblevel - 1, result.isVideo, undefined, result.pid));
				console.log('pItem after create new:', pItem);
				const pItemCount = pItem.children.length - 1;
				const updateParentOption = {
					id: result.pid,
					count: pItemCount,
				};
				if (pItem.dblevel > 1) await this._dataService.updateSingle(pItem.dblevel, updateParentOption);
				// update UI view
				this.selectedItem = await _.cloneDeep(result);
				await this.selectedTopics[level - 1].item.children.push(this.selectedItem);
				await this.selectOptionChange(level, this.selectedItem.id);
				console.log(this.selectedItem);
				resolve(result);
			}, async (error) => {
				// query if existing
				console.log('there was an error sending the query', error, 'try querying existing topic', pItem, url);
				const [result]: any = await this.getOptions(pItem.dblevel + 1, pItem.isVideo, undefined, undefined, url);
				if (result) resolve(result);
			});

		})
	}

	async createDirDB(itemName, pItem) {
		return new Promise<string>(async (resolve, reject) => {
			console.log('createmass called:', itemName, pItem);
			const gql = this.selectedTopics[pItem.dblevel + 1 - 1].createGQL;
			const pureLatin = await this.langToLatin(itemName);
			const url = pItem.url.concat('.', pureLatin.toLowerCase().replace(/[\W\_]/g, '-')).replace(/^\.|\.$/g, '').replace(/-+-/g, "-");
			await this.apollo.mutate<any>({
				mutation: gql,
				variables: {
					pid: pItem.id,
					isLeaf: false,
					url: url,
					isVideo: pItem.isVideo,
					name: itemName,
				}
			}).subscribe(async ({ data }) => {
				console.log('created local DB', data);
				const result = await _.cloneDeep(data[Object.keys(data)[0]]);
				const [pItem] = _.cloneDeep(await this._dataService.fetchLevelDB(result.dblevel - 1, result.isVideo, undefined, result.pid));
				console.log('pItem after create new:', pItem);
				const pItemCount = pItem.children.length + 1;
				const updateParentOption = {
					id: result.pid,
					count: pItemCount,
				};
				await this._dataService.updateSingle(pItem.dblevel, updateParentOption);
				resolve(result);
			}, async (error) => {
				// query if existing
				console.log('there was an error sending the query', error, 'try querying existing topic');
				const [result]: any = await this.getOptions(pItem.dblevel + 1, pItem.isVideo, undefined, undefined, url);
				if (result) resolve(result);
			});
		})
	}


	async processDirDB(listArray) {
		return new Promise(async (resolve, reject) => {

			// create large db instant code start
			// this.newDBArray = [];
			if (this.selectedItem.name === 'Audio' || this.selectedItem.name === 'Video') {
				this.selectedItem.url = '';
			}
			if (this.newDBArray.findIndex(item => item.id === this.selectedItem.id) < 0) this.newDBArray.push(this.selectedItem);
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
					const newItem = await this.createDirDB(listArray[i].name, this.newDBArray[pIndex]);
					this.newDBArray.push(newItem);
					if (newItem) {
						i++;
					}
				} else {
					console.log('pItem not found', listArray[i]);
				}
			}
			if (i === listArray.length) {
				resolve('done')
			}

		})
	}


	langToLatin(str) {
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
		return str;
	}

	async findIndexArray(arr, md5) {
		return new Promise(function (resolve, reject) {
			let i = 0;
			while (i < arr.length) {
				if (arr[i].children) {
					const index = arr[i].children.findIndex(item => item.md5 === md5);
					if (index > -1) {
						console.log('found exist:', arr[i].children, md5);
						resolve(arr[i].children[index])
						break;
					};
				}
				i++
				if (i === arr.length) { resolve(false) };
			}
		})
	}

	async test() {
		console.log(this.inputPath);

		// // instance update
		// const qmHash = 'QmQDuZsCmxQm2WwB5WHjG5n92kjuukaKrN7Py59hHC3FJs'
		// const secretKey = slice(0, 32, `01-bai-giang.hoc-theo-sach-trong-kinh-thanh.tim-hieu-thanh-kinh.thtk01-sang-the-ky.sa01-tim-hieu-khai-quatgggggggggggggggggggggggggggggggg`);
		// const folderHash = CryptoJS.AES.encrypt(qmHash, secretKey).toString();
		// const keyHash = CryptoJS.AES.encrypt('QmSNageBUDv9gAEt1Y9NukENbQKMhRcsZQC2svWYib2m6T', secretKey).toString();
		// const updateOption = {
		//   id: this.updateID,
		//   url: this.updateURL,
		//   // qm: qmHash,
		//   // hash: folderHash,
		//   // khash: keyHash,
		// };
		// console.log(updateOption);

		// await this._dataService.updateSingle(this.updateLevel, updateOption);
		// this._electronService.ipcRenderer.send('instance-db', this.updateURL);


		// const item = await this._dataService.fetchLevelDB(1, true, false);
		// console.log('got itemmmmmm', item);

		// const testItem = await this.getOptions(1, true, '00000000-0000-0000-0000-000000000001'); // 00000000-0000-0000-0000-000000000001 3c99cef1-0b91-4cff-a01b-2aa3cc0ca1d4
		// console.log(testItem);


		// console.log(this.path, this.level);
		// if (this._electronService.isElectronApp) {
		//   this._electronService.ipcRenderer.send('test', this.path, this.level);
		// }

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



	openDialog() {
		if (this._electronService.isElectronApp) {
			this._electronService.ipcRenderer.invoke('open-dialog', this.fileCheckbox, this.isVideo).then((inpath) => {
				this.zone.run(() => {
					this.inputPath = inpath;
				})
			})
		}
	}


	async preConvert() {
		if (this._electronService.isElectronApp) {
			console.log('preConvert called');

			if (!this.inputPath || !this.selectedItem) {
				return this._electronService.ipcRenderer.invoke('popup-message', 'missing-path');
			}
			if (this.selectedTopics[this.selectedItem.dblevel].id === '0') {
				return await this.startConvert(this.inputPath, this.fileCheckbox, this.selectedItem, this.isVideo, this.isGPU);
			}
			if (this.selectedTopics[this.selectedItem.dblevel].id === '1' && !this.fileCheckbox) {
				const pItem = this.selectedItem;
				for (let i = 0; i < this.inputPath.length; i++) {
					const selectedItem = await this.createNewTopic(pItem.dblevel + 1, path.basename(this.inputPath[i]));
					this.startConvert(this.inputPath[i], this.fileCheckbox, selectedItem, this.isVideo, this.isGPU);
				}
				return 'done';
			}
			return this._electronService.ipcRenderer.invoke('popup-message', 'topic-db-error');
		}
	}


	async startConvert(inputPath, fileCheckbox, selectedItem, isVideo, isGPU) {
		console.log('startConvert Called:', inputPath, selectedItem);
		this.tasks.push(inputPath);
		this.isConverting = true;
		// create directory DB first
		const dirList = fileCheckbox ? [] : await this._electronService.ipcRenderer.invoke('find-dir-db', inputPath);
		console.log('dirList Called:', dirList);
		await this.processDirDB(dirList);
		// find all files
		const fileList = fileCheckbox ? inputPath : await this._electronService.ipcRenderer.invoke('find-file-db', inputPath, isVideo);
		console.log('fileList Called:', fileList);
		this.totalFiles += fileList.length;
		console.log('Checking input source', fileList, this.totalFiles);

		queue.concurrency = parseInt(this.concurrency);
		if (fileList.length > 0) {
			try {
				let tasks = [];
				fileList.forEach(file => {
					const itemName = path.basename(file)
					const pName = path.basename(path.dirname(file));
					const index = this.newDBArray.findIndex((pItem) => pItem.name === pName);
					const pItem = dirList.length !== 0 ? index >= 0 ? this.newDBArray[index] : undefined : selectedItem;
					if (pItem) {
						tasks.push(async () => {
							const md5 = await this._electronService.ipcRenderer.invoke('checksum', file);
							const fileExist: any = await this.findIndexArray(this.newDBArray, md5);
							console.log('check file exist:', fileExist);
							if (fileExist && fileExist.name !== itemName) {
								console.log('file exist, update item name');
								const updateItemOption = {
									id: fileExist.id,
									name: itemName,
								};
								await this._dataService.updateSingle(fileExist.dblevel, updateItemOption);
							}
							if (!fileExist) {
								// start converting files
								console.log('start converting files', file, pItem);
								await this._electronService.ipcRenderer.invoke('start-convert', file, md5, pItem, isGPU);

							}
							this.convertedFiles++;
						})
					}
				});
				await Promise.all(tasks.map(task => queue.add(task))).then(async () => {
					this.tasks.splice(this.tasks.indexOf(inputPath), 1)
					if (queue.size === 0 && queue.pending === 0) {
						this.execDone();
						this._electronService.ipcRenderer.invoke('popup-message', 'exec-done');
					}
				});

			} catch (error) {
				console.log(error);
			}
		} else {
			console.log('no file found');
			this._electronService.ipcRenderer.invoke('popup-message', 'no-file-found');
		}


	}

	async execDone() {
		if (this._electronService.isElectronApp) {
			this.zone.run(() => {
				this.isConverting = false;
				this.inputPath = '';
				this.convertedFiles = 0;
				this.totalFiles = 0;
				this.progressLoading = false;
				this.progressionStatus = 0;
				this.newDBArray = [];
				this._dataService.treeRefresh(this.isVideo);
			})
		}
	}


	async cancel() {
		if (this._electronService.isElectronApp) {
			queue.clear();
			this._electronService.ipcRenderer.invoke('stop-convert').then((response) => {
				this.execDone();
			})
		}
	}

}