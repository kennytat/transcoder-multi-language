import { dialog } from 'electron'
import { exec, spawn, execSync, spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as pinyin from 'chinese-to-pinyin';
import * as md5 from 'md5-file';
import { ipfsGateway, warehouseConf } from './database';
import { tmpDir } from './index';
import PQueue from 'p-queue';
import { CID } from 'multiformats/cid'
export const rcloneQueue = new PQueue({ concurrency: 2 });


export const s3ConfWrite = async (config) => {
	return new Promise(async (resolve) => {
		const confPath = path.join(tmpDir, `${config.name}.conf`);
		let data = `[${config.name}]\n`
		Object.getOwnPropertyNames(config).forEach((val, index, array) => {
			if (val !== 'id' && val !== 'status' && val !== 'name' && val !== 'bucket') {
				data = data + `${val} = ${config[val]}\n`
			}
		});
		await fs.writeFileSync(confPath, data);
		resolve('done');
	})
}

export const s3ConnCheck = async (config) => {
	return new Promise(async (resolve) => {
		exec(`rclone lsd --config="${config.path}" ${config.name}:`, { timeout: 15000 }, (error, stdout, stderr) => {
			if (error) resolve(false);
			resolve(true);
		})
	})
}

export const ipfsGWCheck = async (gateway) => {
	return new Promise(resolve => {
		exec(`curl -X POST "${gateway}/api/v0/id"`, { timeout: 5000 }, (error, stdout, stderr) => {
			if (stdout) resolve(true);
			resolve(false);
		})
	})
}

export const searchGWCheck = async (gateway: string, key: string) => {
	return new Promise(resolve => {
		exec(`curl -X GET "${gateway}/version" -H 'Authorization: Bearer ${key}'`, { timeout: 5000 }, (error, stdout, stderr) => {
			if (stdout && JSON.parse(stdout).pkgVersion) resolve(true);
			resolve(false);
		})
	})
}

export const dnsGWCheck = async (config) => {
	return new Promise(async resolve => {
		try {
			const cf = require('cloudflare')(
				{
					token: config.cf_token
				}
			);
			const resp = await cf.zones.read(config.cf_zone_id);
			if (resp.result.status === 'active') { resolve(true) }
			resolve(false);
		} catch (error) {
			console.log(error);
			resolve(false);
		}
	})
}

// Show message box function
export function showMessageBox(options, win = null) {
	dialog.showMessageBox(win, options).then(result => {
		console.log(result.response);
	}).catch(err => { console.log(err) });
}

export async function md5Checksum(filePath) {
	console.log('checksum called:', filePath);
	return await md5(filePath);
}

// Rewrite vietnamese function
export function langToLatin(str) {
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
	// non chinese characters
	str = pinyin(str, { removeTone: true, keepRest: true })
	return str;
}


export const packCar = async (input, output) => {
	console.log('packing Car:', input, output);
	return new Promise(async (resolve, reject) => {
		if (fs.existsSync(output)) fs.unlinkSync(output);
		execSync(`ipfs-car --wrapWithDirectory false --pack '${input}' --output '${output}'`);
		console.log('packed car done');
		resolve(true);
	})
}


// uploadIPFS function
export const uploadIPFS = async (srcPath: string, type: string, isDir = true) => {
	return new Promise(async (resolve) => {
		try {
			const gwStatus = await ipfsGWCheck(ipfsGateway);
			if (gwStatus) {
				if (isDir) {
					const carPath = type === 'decrypted' ? path.join(tmpDir, `${path.basename(srcPath)}-${type}.car`) : path.join(tmpDir, `${path.basename(srcPath)}.car`);
					await packCar(srcPath, carPath);
					if (type === 'encrypted') {
						const upWarehousePath = `${warehouseConf.name}:${warehouseConf.bucket}/`;
						rcloneCopy(carPath, upWarehousePath, warehouseConf.path, ['--include', path.basename(carPath)])
					}
					console.log('uploadingIPFS:', carPath);
					// add via dag import
					exec(`curl -X POST -F file=@${carPath} "${ipfsGateway}/add?format=car&stream-channels=false"`, async (err, stdout, stderr) => {
						if (stdout) {
							const cid = JSON.parse(stdout)[0].cid;
							if (type === 'decrypted' && fs.existsSync(carPath)) fs.unlinkSync(carPath);
							console.log('upload car done:', carPath, cid);
							const v0Hash = CID.parse(cid).toV0().toString()
							resolve(v0Hash);
						}
						if (err) {
							console.log('upload car failed @@:', carPath);
							if (fs.existsSync(carPath)) fs.unlinkSync(carPath);
							resolve(false);
						}
					})
				} else {
					exec(`curl -X POST -F file=@${srcPath} "${ipfsGateway}/add"`, async (err, stdout, stderr) => {
						if (stdout) {
							const cid = JSON.parse(stdout).cid;
							if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
							console.log('upload file done:', srcPath, cid);
							const v0Hash = CID.parse(cid).toV0().toString()
							resolve(v0Hash);
						}
						if (err) {
							console.log('upload file failed @@:', srcPath);
							if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
							resolve(false);
						}
					})
				}
			} else {
				resolve(false);
			}
		} catch (error) {
			console.log(error);
			resolve(false);
		}
	});
}

export const rcloneCopy = (source, des, confPath = undefined, extraOption = []) => {
	const confOption = confPath ? ['--config', confPath] : [];
	console.log('Rclone copy:', `'${source}/'`, `'${des}/'`, confOption, extraOption);
	const src = extraOption.findIndex(elem => elem === '--include') < 0 ? source : path.dirname(source);
	(async () => {
		rcloneQueue.add(async () => {
			const rclone = spawn('rclone', ['copy', '--progress', `${src}/`, `${des}/`].concat(confOption).concat(extraOption), { detached: true });
			rclone.stdout.on('data', async (data) => {
				console.log(`rclone copy stdout: ${data}`);
			});
			rclone.stderr.on('data', async (data) => {
				console.log(`Stderr: ${data}`);
			});
			rclone.on('close', async (code) => {
				console.log(`Rclone copy file done with code:`, code);
				if (fs.existsSync(source) && fs.lstatSync(source).isDirectory()) fs.rmdirSync(source, { recursive: true });
				if (fs.existsSync(source) && !fs.lstatSync(source).isDirectory()) fs.unlinkSync(source);
				console.log('removed converted folder');
			})
		});
	})();
}

export const rcloneDelete = async (des, confPath, extraOption = []) => {
	(async () => {
		rcloneQueue.add(async () => {
			const confOption = confPath ? ['--config', confPath] : [];
			console.log('Rclone delete:', `'${des}/'`, confOption, extraOption);
			const rclone = spawn('rclone', ['delete', '--progress', `${des}/`].concat(confOption).concat(extraOption), { detached: true });
			rclone.stdout.on('data', async (data) => {
				console.log(`rclone delete stdout: ${data}`);
			});
			rclone.stderr.on('data', async (data) => {
				console.log(`Stderr: ${data}`);
			});
			rclone.on('close', async (code) => {
				console.log(`Rclone delete file done with code:`, code);
			})
		});
	})();
}

export const updateSingleAPI = async (filePath) => {
	console.log('checksum called:', filePath);
	return await md5(filePath);
}
