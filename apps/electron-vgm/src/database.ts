import { app, dialog, ipcMain } from 'electron'
import { exec, spawn, execSync, spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
	showMessageBox,
	rcloneCopy,
	rcloneDelete,
	s3ConfWrite,
	s3ConnCheck,
	ipfsGWCheck,
	dnsGWCheck,
	searchGWCheck,
	md5Checksum,
	uploadIPFS
} from './function';
import { win, tmpDir } from './index';

export interface FileInfo {
	pid: string,
	name: string,
	size: number,
	md5: string,
	duration: string,
	qm: string,
	url: string,
	hash: string,
	khash: string,
	isVideo: boolean,
	dblevel: number
}

export let warehouseConf = {
	path: '',
	name: '',
	bucket: ''
};
export let encryptedConf = {
	path: '',
	name: '',
	bucket: ''
};
export let ipfsGateway = '';


export const databaseService = () => {
	ipcMain.handle('check-conf', async (event, config) => {
		console.log('got conf:', config);
		let result;
		const confPath = path.join(tmpDir, `${config.name}.conf`);
		try {
			switch (config.id) {
				case "warehouse":
					warehouseConf.path = confPath;
					warehouseConf.name = config.name;
					warehouseConf.bucket = config.bucket;
					await s3ConfWrite(config);
					result = await s3ConnCheck(warehouseConf);
					break;
				case "encrypted":
					encryptedConf.path = confPath;
					encryptedConf.name = config.name;
					encryptedConf.bucket = config.bucket;
					await s3ConfWrite(config);
					result = await s3ConnCheck(encryptedConf);
					break;
				case "ipfs":
					ipfsGateway = config.gateway;
					result = await ipfsGWCheck(config.gateway);
					break;
				case "search":
					result = await searchGWCheck(config.gateway, config.key);
					break;
				case "dns":
					result = await dnsGWCheck(config);
					break;
				default:
					break;
			}
			return result;
		} catch (error) {
			throw error;
		}
	})

	// add mass DB folder recursively
	ipcMain.handle('find-dir-db', async (event, dirPath: string) => { // instant add to db
		let apiArray = [];
		try {
			const list = await execSync(`find '${dirPath}' -type d -printf '%h\\0%d\\0%p\\n' | sort -t '\\0' -n | awk -F '\\0' '{print $3}'`, { encoding: 'utf8' });
			const listArray = await list.toString().split('\n');
			console.log('listArray:', listArray, listArray.length);
			if (listArray) {
				for await (const folderPath of listArray) {
					if (folderPath && folderPath != '\n' && folderPath != dirPath) {
						const folderName = path.basename(folderPath);
						const re = new RegExp(`${dirPath}[\/]?`, "g");
						const pAPI = path.dirname(folderPath).replace(re, '');
						apiArray.push({
							pName: pAPI,
							name: folderName,
							pathLevel: ((folderPath || '').match(/\//) || []).length
						})
					}
				}
				console.log(apiArray);
				return apiArray.sort((a, b) => {
					if (a.pathLevel < b.pathLevel) return -1;
					if (a.pathLevel > b.pathLevel) return 1;
					return 0;
				});
			}
		} catch (error) {
			console.log('fs promise error:', error);
		}
	})

	// add mass DB folder recursively
	ipcMain.handle('find-file-db', async (event, dirPath: string, isVideo: boolean) => { // instant add to db
		const fileType = isVideo ? 'mp4' : 'mp3';
		console.log('got DirPath:', dirPath);

		let filesArray = execSync(`find '${dirPath}' -name '*.${fileType}'`, { encoding: "utf8" }).split('\n');
		filesArray.pop();
		return filesArray;
	})

	// checkSum MD5 file
	ipcMain.handle('checksum', async (event, filePath: string) => {
		const md5Sum = await md5Checksum(filePath);
		console.log('gotsum', md5Sum);
		return md5Sum;
	})


	ipcMain.handle('export-database', async (event, apiType: string, item, fileType) => {
		console.log('export-database called', item);
		const json = fileType === 'searchAPI' ? JSON.stringify(item) : JSON.stringify(item, null, 2);

		// handle file path
		let filePath: string;
		if (fileType === 'itemList') {
			filePath = path.join(tmpDir, `API-${apiType}`, 'items', 'list', `${item.url}.json`);
		} else if (fileType === 'itemSingle') {
			filePath = path.join(tmpDir, `API-${apiType}`, 'items', 'single', `${item.url}.json`);
		} else if (fileType === 'topicList') {
			filePath = path.join(tmpDir, `API-${apiType}`, 'topics', 'list', `${item.url}.json`);
		} else if (fileType === 'topicSingle') {
			filePath = path.join(tmpDir, `API-${apiType}`, 'topics', 'single', `${item.url}.json`);
		} else if (fileType === 'searchAPI') {
			filePath = path.join(tmpDir, `API-${apiType}`, `searchAPI.json`);
		} else if (fileType === 'apiVersion') {
			filePath = path.join(tmpDir, `API-${apiType}`, `apiVersion.json`);
		} else if (fileType === 'apiJson') {
			filePath = path.join(tmpDir, `API-${apiType}`, `instruction.json`);
		}
		const dir = path.dirname(filePath)
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		await fs.writeFile(filePath, json, function (err) {
			if (err) throw err;
		});

		return 'done';
	})


	ipcMain.handle('upload-api', async (event, apiType) => {
		try {
			const src = path.join(tmpDir, `API-${apiType}`);
			if (apiType === 'web') {
				const des = `${encryptedConf.name}:${encryptedConf.bucket}/API`;
				const extraOption = ['--no-update-modtime', '--transfers', '10', '--s3-chunk-size', '64M'];
				console.log('uploading API:', src, des, encryptedConf.path);
				rcloneCopy(src, des, encryptedConf.path, extraOption);
				return 'done';
			}
			if (apiType === 'speaker') {
				const apiCID: any = await uploadIPFS(src, 'speakerAPI');
				return apiCID;
			}
		} catch (error) {
			console.log(error);
			return null
		}
	})

	ipcMain.handle('upload-db-confirmation', async (event) => {
		try {
			let options;
			options = {
				type: 'question',
				buttons: ['Cancel', 'Upload'],
				defaultId: 0,
				title: 'Upload Confirmation',
				message: 'Uploading API',
				detail: 'Upload process takes approxmately 15 mins',
			}
			return await dialog.showMessageBox(win, options).then(result => {
				return result.response
			})
		} catch (error) {
			console.log(error);
			return null
		}
	})

	ipcMain.handle('exec-db-confirmation', async (event, method) => {
		try {
			let options;
			if (method === 'updateDB') {
				options = {
					type: 'question',
					buttons: ['Cancel', 'Update'],
					defaultId: 0,
					title: 'Update Confirmation',
					message: 'Are you sure want to update selected entries',
					detail: 'Update data will also update entries on network',
				}
			} else if (method === 'deleteDB') {
				options = {
					type: 'question',
					buttons: ['Cancel', 'Delete data'],
					defaultId: 0,
					title: 'Deletion Confirmation',
					message: 'Are you sure want to delete selected entries',
					detail: 'Delete data will also update entries on network',
				}
			}
			return await dialog.showMessageBox(win, options).then(result => {
				return { method: method, response: result.response }
			})
		} catch (error) {
			console.log(error);
			return null
		}
	})

	ipcMain.handle('delete-file', async (event, file) => {
		try {
			const fileType = file.isVideo ? 'VGMV' : 'VGMA';
			const convertedPath = `${encryptedConf.name}:${encryptedConf.bucket}/${fileType}/${file.url.replace(/\./g, '\/')}`;
			await rcloneDelete(convertedPath, encryptedConf.path);
			const warehousePath = `${warehouseConf.name}:${warehouseConf.bucket}/${file.url}.car`
			await rcloneDelete(warehousePath, warehouseConf.path);
			console.log('deleting data:', convertedPath, warehousePath);
			return 'done';
		} catch (error) {
			console.log(error);
			return null
		}
	})


	ipcMain.handle('exec-db-done', (event, message) => {
		const options = {
			type: 'info',
			title: 'Done',
			message: 'Your request have been executed sucessfully!',
			detail: message,
		};
		showMessageBox(options);
	})

	ipcMain.handle('update-dns', (event, config) => {
		return new Promise(async resolve => {
			try {
				const cf = require('cloudflare')({ token: config.cf_token });
				const dnsID = await cf.dnsRecords.browse(config.cf_zone_id).then(dnses => {
					const i = dnses.result.findIndex(dns => dns.name === config.cf_dns)
					if (i >= 0) return dnses.result[i].id
					return undefined;
				});
				const apiPath = path.join(tmpDir, `API-speaker`, `instruction.json`);
				const dnsValue = await uploadIPFS(apiPath, 'speakerAPI', false);
				const subDomain = config.cf_dns.split('.').slice(0, -2).join('.');
				const dnsRecord = { type: "TXT", name: subDomain, content: `dnslink=/ipfs/${dnsValue}` }
				console.log('updating dns record:', config.cf_zone_id, dnsID, dnsRecord);
				if (config.cf_zone_id && dnsID && dnsValue) {
					const newRecord = await cf.dnsRecords.edit(config.cf_zone_id, dnsID, dnsRecord);
					console.log('modified DNS Record::', newRecord);
					if (newRecord.success) resolve(true)
				}
				resolve(false);
			} catch (error) {
				console.log(error);
				resolve(false);
			}
		})

	});

	ipcMain.handle('update-single-api', async (event, url) => {
		try {
			const src = path.join(tmpDir, `API-${url}`);
			const des = `${encryptedConf.name}:${encryptedConf.bucket}/API`;
			const extraOption = ['--no-update-modtime', '--transfers', '10', '--s3-chunk-size', '64M'];
			console.log('uploading API:', src, des, encryptedConf.path);
			rcloneCopy(src, des, encryptedConf.path, extraOption);
			return 'done';
		} catch (error) {
			console.log(error);
			return null
		}
	})
}