import { Component, Injectable, NgZone, OnInit, SimpleChanges } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ElectronService } from 'ngx-electron';
import { Subscription } from 'rxjs';
import { TreeviewItem, TreeviewConfig } from 'ngx-treeview';
import CryptoJS from "crypto-js";
import { slice } from 'ramda';
import * as type from 'libs/xplat/core/src/lib/services/graphql.types';
import { ConfigService, DataService } from '@vgm-converter/xplat/core';
import * as _ from 'lodash';
import Pqueue from 'p-queue';
import { LoadingController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
const queue = new Pqueue();

const apiGateway = 'http://find.hjm.bid';


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
	loadingModal;
	constructor(
		private _electronService: ElectronService,
		private zone: NgZone,
		private apollo: Apollo,
		private _dataService: DataService,
		private _configService: ConfigService,
		public loadingController: LoadingController,
		public toastController: ToastController,
		private _translateService: TranslateService,
	) {
		this.videoTreeSub = this._dataService.videoTree$.subscribe(async (data) => {
			if (data.value) {
				this.videoTree = [new TreeviewItem(data)];
				this.videoFiles = await this.getAllDB(true, null);
				console.log(this.videoTree);
			}
		});

		this.audioTreeSub = this._dataService.audioTree$.subscribe(async (data) => {
			if (data.value) {
				this.audioTree = [new TreeviewItem(data)];
				this.audioFiles = await this.getAllDB(false, null);
				console.log(this.audioTree);
			}
		});

		if (this._electronService.isElectronApp) {
			this._electronService.ipcRenderer.on('create-database', async (event, fileInfo) => {
				console.log('createDB called', fileInfo);
				await this.createNewItem(fileInfo);
			})
			// this._electronService.ipcRenderer.on('update-ipfs', async (event, fileInfo) => {
			// 	console.log('update IPFS Hash called', fileInfo);
			// 	const variables = {
			// 		id: fileInfo.id,
			// 		url: fileInfo.url,
			// 		// khash: fileInfo.khash,
			// 		// hash: fileInfo.hash,
			// 		// qm: fileInfo.qm,
			// 	};
			// 	await this._dataService.updateSingle(fileInfo.dblevel, variables);
			// })
			// this._electronService.ipcRenderer.on('update-count', async (event, fileInfo) => {
			// 	console.log('update count called', fileInfo);
			// 	const variables = {
			// 		id: fileInfo.id,
			// 		count: fileInfo.count,
			// 		md5: fileInfo.md5,
			// 		hash: fileInfo.hash,
			// 		khash: fileInfo.khash
			// 	};
			// 	await this._dataService.updateSingle(fileInfo.dblevel, variables);
			// })
			// this._electronService.ipcRenderer.on('update-leaf', async (event, fileInfo) => {
			// 	console.log('update leaf called', fileInfo);
			// 	const variables = {
			// 		id: fileInfo.id,
			// 		isLeaf: fileInfo.isLeaf
			// 	};
			// 	await this._dataService.updateSingle(fileInfo.dblevel, variables);
			// })
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
			await this._dataService.dbInit();
			this._dbInit = this._dataService._dbInit;
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
				md5: item.md5,
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
			const [pItem] = _.cloneDeep(await this._dataService.fetchLevelDB(result.dblevel - 1, result.isVideo, undefined, result.pid));
			console.log('pItem after create new:', pItem);
			const pItemCount = pItem.children.length + 1;
			const updateParentOption = {
				id: result.pid,
				isLeaf: true,
				count: pItemCount,
			};
			await this._dataService.updateSingle(pItem.dblevel, updateParentOption);
		}, (error) => {
			console.log('error creating new item', error);
		});
	}

	async refreshDB() {
		await this.presentLoading(this._translateService.instant('database.msg.refresh-waiting'), 3000)
		await this._dataService.treeRefresh(this.isVideo);
	}

	async test() {
		// await this.presentLoading(this._translateService.instant('database.msg.export-waiting'));
		// await this.presentToast(this._translateService.instant('database.msg.export-api'), 'toast-success');
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

		// // test instant create item 
		// const item = {
		//   pid: '9d9be977-4407-4097-bfd6-b02af3b27c80',
		//   name: 'TTBMat03_Sự Khấy Động Từ Các Nhà Thông Thái',
		//   size: 213499477,
		//   duration: '3:19',
		//   qm: '',
		//   url: '03-hoat-hinh.hoat-hinh-2d.hoat-hinh-2d-bo.tim-hieu-thanh-kinh.01-phuc-am-ma-thi-o.ttbmat03-su-khay-dong-tu-cac-nha-thong-thai',
		//   hash: '',
		//   khash: 'U2FsdGVkX1/o3AVKfVs0LKVe6XFK0vVrWsjMIxQBI/1BJTvT9emgk1bSEia5WxvLR5oUPMi+DPFGanBQjGuSmA==',
		//   isVideo: true,
		//   dblevel: 7
		// }
		// await this.createNewItem(item);


		// // convert instance code
		if (this._electronService.isElectronApp) {
			console.log(this._configService.configs);
			console.log(this._configService.encryptedConf);

			// set prefixed local path to database folder, start vs end converting point for each machine. Ex: '/home/vgmuser/Desktop' 
			// const prefixPath = '/home/vgm/Desktop';
			// const startPoint = 720; // ipfs 299 file done 1350
			// const endPoint = 2250;
			// this._electronService.ipcRenderer.send('test', prefixPath, fileType, startPoint, endPoint); // 'test' 'fastly' 
			// this._electronService.ipcRenderer.send('cloud-to-ipfs', prefixPath, fileType, startPoint, endPoint);
			// this._electronService.ipcRenderer.send('get-count');
			// this._electronService.ipcRenderer.send('xor-key-ipfs', prefixPath, startPoint, endPoint);
			// this._electronService.ipcRenderer.send('ipfs-hash-to-db', prefixPath, startPoint, endPoint);
			// this._electronService.ipcRenderer.send('ipfs-unpin', prefixPath, startPoint, endPoint);
			// const xorPath = '/home/vgm/Desktop'
			// this._electronService.ipcRenderer.send('xor-key', xorPath, false);
			// this._electronService.ipcRenderer.send('create-instance-db', prefixPath, startPoint, endPoint);
			this._electronService.ipcRenderer.invoke('test-data', '/home/vgm/Desktop/newupload/7 Kỳ Lễ/6_Lễ Thổi Kèn.mp4');
		}

		// const fileInfo = {
		//   pid: '193f4b25-1d46-4d15-8d87-d181de0a93bf',
		//   name: '01-Đức Thánh Linh Có Ngự Trong Tôi Không P1',
		//   size: 2258434926,
		//   duration: '76:44',
		//   qm: '',
		//   url: '01-bai-giang.hoc-theo-chu-de.11-than-le-that---trai-tn2017.01-duc-thanh-linh-co-ngu-trong-toi-khong-p1',
		//   hash: '',
		//   isVideo: true,
		//   dblevel: 5
		// }


	}

	async exportAPI() {
		if (this._electronService.isElectronApp) {
			this._electronService.ipcRenderer.invoke('upload-db-confirmation').then(async (result) => {
				if (result === 1) {
					await this.presentLoading(this._translateService.instant('database.msg.export-waiting'));
					if (this._configService.encryptedConf.status) {
						await this.exportWebAPI();
						// await this._electronService.ipcRenderer.invoke('upload-api', 'web');
						await this._electronService.ipcRenderer.invoke('upload-tmp-api', 'web');
					} else {
						await this.presentToast(this._translateService.instant('database.msg.cloud-error'), 'toast-error');
					}
					if (this._configService.ipfsAPIGateway.status) {
						await this.exportSpeakerAPI();
						await this._electronService.ipcRenderer.invoke('upload-api', 'speaker');
						// 	let apiJson = await fetch(apiGateway).then(async (response) => await (await response.clone()).json());
						// 	console.log('apiJson', apiJson);
						// 	await this._electronService.ipcRenderer.invoke('export-database', 'speaker', apiJson, 'apiJson');
						// await this._electronService.ipcRenderer.invoke('add-ipfs', `${outpath}/API-speaker`).then(async (hash) => {
						// 	apiJson.version += 1;
						// 	apiJson.api = hash;
						// 	await this._electronService.ipcRenderer.invoke('export-database', 'speaker', apiJson, outpath, 'apiJson');
						// 	await this._electronService.ipcRenderer.invoke('add-ipfs', `${outpath}/API-speaker/instruction.json`).then(async (apiHash) => {
						// 		const updateDNS = await this._electronService.ipcRenderer.invoke('update-dns', apiHash);
						// 		console.log('Update DNS Status:', apiHash, '\n', updateDNS);
						// 	})
						// });
					} else {
						await this.presentToast(this._translateService.instant('database.msg.ipfs-error'), 'toast-error');
					}
					await this.loadingModal.dismiss();
					await this.presentToast(this._translateService.instant('database.msg.export-api'), 'toast-success');
				}
			})
		}
	}

	async exportWebAPI() {
		return new Promise(async (resolve) => {
			queue.concurrency = 100;
			// // export itemList
			const itemList: any = await this.getAllDB(undefined, true);
			await itemList.forEach(async item => {
				(async () => {
					await queue.add(async () => {
						await this._electronService.ipcRenderer.invoke('export-database', 'web', item, 'itemList');
					});
				})();
			});
			// // export itemSingle
			const itemSingle: any = await this.getAllDB(undefined, null);
			await itemSingle.forEach(async item => {
				(async () => {
					await queue.add(async () => {
						await this._electronService.ipcRenderer.invoke('export-database', 'web', item, 'itemSingle')
					});
				})();
			});
			// export topicList
			const nonLeafList: any = await this.getAllDB(undefined, false);
			const topicList = nonLeafList.concat(itemList);
			await topicList.forEach(async item => {
				(async () => {
					await queue.add(async () => {
						await this._electronService.ipcRenderer.invoke('export-database', 'web', item, 'topicList');
					});
				})();
			});
			// export topicSingle
			await topicList.forEach(async item => {
				(async () => {
					await queue.add(async () => {
						const topic = _.cloneDeep(item);
						delete topic.children;
						await this._electronService.ipcRenderer.invoke('export-database', 'web', topic, 'topicSingle');
					});
				})();
			});
			// export searchAPI
			(async () => {
				await queue.add(async () => {
					const searchList = itemSingle.filter(el => !/^(06-phim)/.test(el.url));
					await this._electronService.ipcRenderer.invoke('export-database', 'web', searchList, 'searchAPI');
				});
			})();
			// export API Version
			(async () => {
				await queue.add(async () => {
					const version = { version: Date.now() };
					await this._electronService.ipcRenderer.invoke('export-database', 'web', version, 'apiVersion');
				});
			})();
			await queue.onEmpty().then(async () => {
				console.log('Export API-web done: Start uploading', this._configService.encryptedConf.status);
				resolve('done');
			});
		})
	}

	async exportSpeakerAPI() {
		return new Promise(async (resolve) => {
			queue.concurrency = 100;
			if (this._electronService.isElectronApp) {
				const itemList: any = await this.getAllDB(false, true);
				await itemList.forEach(async item => {
					const list = _.cloneDeep(item);
					(async () => {
						await queue.add(async () => {
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
							await this._electronService.ipcRenderer.invoke('export-database', 'speaker', exportList, 'itemList');
						});
					})();
				});
				// // export itemSingle
				const itemSingle: any = await this.getAllDB(false, null);
				await itemSingle.forEach(async item => {
					const list = _.cloneDeep(item);
					(async () => {
						await queue.add(async () => {
							const exportList = {
								id: list.id,
								name: list.name,
								url: list.url,
								hash: list.hash
							}
							await this._electronService.ipcRenderer.invoke('export-database', 'speaker', exportList, 'itemSingle')
						});
					})();
				});
				// export topicList
				const nonLeafList: any = await this.getAllDB(false, false);
				const topicList = nonLeafList.concat(itemList);
				await topicList.forEach(async item => {
					const list = _.cloneDeep(item);
					(async () => {
						await queue.add(async () => {
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
							await this._electronService.ipcRenderer.invoke('export-database', 'speaker', exportList, 'topicList');
						});
					})();
				});
				// export topicSingle
				await topicList.forEach(async item => {
					const list = _.cloneDeep(item);
					(async () => {
						await queue.add(async () => {
							const exportList = {
								id: list.id,
								name: list.name,
								url: list.url,
								isLeaf: list.isLeaf,
							}
							await this._electronService.ipcRenderer.invoke('export-database', 'speaker', exportList, 'topicSingle');
						});
					})();
				});
				await queue.onEmpty().then(async () => {
					console.log('7. Queue is empty, export API-speaker done');
					resolve('done');
				});
			}

		})
	}

	async getAllDB(isVideo, isLeaf) {
		return new Promise(async (resolve) => {
			let files: any[] = [];
			for (let i = 0; i < this._dataService.queryGQL.length; i++) {
				await this._dataService.fetchLevelDB(i + 1, isVideo, isLeaf).then((list) => {
					files = files.concat(list);
					if (i === this._dataService.queryGQL.length - 1) {
						resolve(files);
					}
				})
			}
		});
	}

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


	// getQm(url: string, hash: string) {
	// 	const secretKey = slice(0, 32, `${url}gggggggggggggggggggggggggggggggg`);
	// 	const decrypted = CryptoJS.AES.decrypt(hash, secretKey);
	// 	const qm = decrypted.toString(CryptoJS.enc.Utf8);
	// 	console.log('getHash:', url, hash, qm);
	// 	return qm;
	// };


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

	// getThumbnail(hash, url) {
	// 	const secretKey = slice(0, 32, `${url}gggggggggggggggggggggggggggggggg`);
	// 	const decrypt = CryptoJS.AES.decrypt(hash, secretKey);
	// 	const qm = decrypt.toString(CryptoJS.enc.Utf8);
	// 	return `https://vn.gateway.vgm.tv/ipfs/${qm}/480/1.png` || ''
	// }

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

	async execDBConfirmation(method) {
		if (this._electronService.isElectronApp) {
			if (this.selectedFilesID[0]) {
				this._electronService.ipcRenderer.invoke('exec-db-confirmation', method).then(async (result) => {
					if (result.response !== 0) {
						await this.presentLoading(this._translateService.instant('database.msg.process-waiting'));
						if (result.method === 'updateDB') { await this.updateDB(); }
						if (result.method === 'deleteDB') { await this.deleteDB(); }
						await this.loadingModal.dismiss();
						await this.refreshDB();
					}
				})
			} else {
				this._electronService.ipcRenderer.invoke('popup-message', 'empty-select');
			}
		}
	}

	async updateDB() {
		console.log('function to update db');
		this.selectedFileInfo.forEach(item => {
			this.apollo.mutate<any>({
				mutation: this._dataService.updateGQL[item.dblevel - 2],
				variables: {
					id: item.id,
					isLeaf: item.isLeaf,
					count: item.count,
					md5: item.md5,
					name: item.name,
					url: item.url,
					keyword: item.keyword,
					hash: item.hash,
					audience: item.audience,
					mtime: item.mtime,
					viewCount: item.viewCount
				},
			}).subscribe(async ({ data }) => {
				const result = data[Object.keys(data)[0]];
				await this._dataService.updateSearch('add', [result]);
				console.log('updated local DB', data);
			}, (error) => {
				console.log('error updating files', error);
			});
		});
	}

	async getFile(fileID) {
		return new Promise(async (resolve) => {
			for (let i = 0; i < this._dataService.updateGQL.length; i++) {
				const item = await this._dataService.fetchLevelDB(i + 2, this.isVideo, undefined, fileID);
				if (item && item[0]) {
					resolve(item);
				};
			}
		})
	}

	async deleteDB() {
		return new Promise(async (resolve) => {
			queue.concurrency = 5;
			this.selectedFilesID.forEach(async (fileID) => {
				(async () => {
					await queue.add(async () => {
						console.log(fileID);
						const [selectedItem]: any = await this.getFile(fileID);
						console.log('get selected Item:::::', selectedItem);
						await this.apollo.mutate<any>({
							mutation: this.deleteGQL[selectedItem.dblevel - 2],
							variables: { id: fileID },
						}).subscribe(async ({ data }) => {
							console.log('delete local DB', data);
							const result: any = data[Object.keys(data)[0]];
							const [pItem] = _.cloneDeep(await this._dataService.fetchLevelDB(result.dblevel - 1, result.isVideo, undefined, result.pid));
							const pItemCount = pItem.children.length - 1;
							const updateParentOption = {
								id: result.pid,
								count: pItemCount,
							};
							await this._dataService.updateSingle(pItem.dblevel, updateParentOption);
							await this._dataService.updateSearch('delete', [fileID]);
							if (this._electronService.isElectronApp) {
								const fileType = result.isVideo ? 'VGMV' : 'VGMA';
								await this._electronService.ipcRenderer.invoke('delete-file', `${fileType}/${result.url.replace(/\./g, '\/')}`);
							}
						}, (error) => {
							console.log('error deleting files', error);
						});
					});
				})();
			});
			await queue.onEmpty().then(() => {
				console.log('7. Queue is empty - export API-web done');
				const execDoneMessage: string = `Total ${this.selectedFilesID.length} items has been deleted`;
				this.execDBDone(execDoneMessage);
				resolve('done');
			});

		})
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

	async presentLoading(msg, duration = 0) {
		this.loadingModal = await this.loadingController.create({
			cssClass: 'loading-modal',
			message: msg,
			duration: duration
		});
		await this.loadingModal.present();
	}

	async presentToast(message, cssClass) {
		const toast = await this.toastController.create({
			message: message,
			position: 'top',
			duration: 2000,
			cssClass: cssClass
		});
		toast.present();
	}

}
