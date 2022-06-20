import { app, ipcMain } from 'electron'
import { exec, spawn, execSync, spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { showMessageBox, langToLatin, uploadIPFS, rcloneSync } from './function';
import { FileInfo, encryptedConf } from './database';
import { tmpDir } from './index';
// import { create, globSource, CID } from 'ipfs-http-client'
import * as CryptoJS from "crypto-js";
import { slice } from 'ramda';
import * as M3U8FileParser from "m3u8-file-parser";
import * as bitwise from 'bitwise';
import PQueue from 'p-queue';
const queue = new PQueue();

export const convertService = () => {

	// Get input and output path from above and execute sh file
	ipcMain.handle('start-convert', async (event, inputFile: string, md5 = '', pItem, isGPU = true) => {
		const checkMP4 = async (tmpPath, fType) => {
			console.log('checking downloaded file', `${tmpPath}`);
			return new Promise(async (resolve) => {
				let info = await execSync(`ffprobe -v quiet -print_format json -show_streams "${tmpPath}"`, { encoding: 'utf8' });
				if (fType === 'video') {
					const jsonInfo = JSON.parse(info);
					const displayRatio = (jsonInfo.streams[0].width / jsonInfo.streams[0].height).toFixed(2);
					console.log(jsonInfo.streams[0].codec_long_name, displayRatio);
					// await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n${tmpPath} ${jsonInfo.streams[0].codec_long_name} ${displayRatio}`);
					if (jsonInfo.streams[0].codec_long_name === 'MPEG-4 part 2' || displayRatio === (4 / 3).toFixed(2)) {
						const tmpName = path.parse(tmpPath).name;
						const mp4Tmp = tmpPath.replace(tmpName, `${tmpName}1`);
						await execSync(`mv "${tmpPath}" "${mp4Tmp}"`);
						console.log(mp4Tmp, tmpPath);
						const mp4 = spawn('ffmpeg', ['-vsync', '0', '-i', `${mp4Tmp}`, '-c:v', 'h264_nvenc', '-filter:v', `pad="width=max(iw\\,ih*(16/9)):height=ow/(16/9):x=(ow-iw)/2:y=(oh-ih)/2"`, '-c:a', 'copy', `${tmpPath}`]);
						mp4.stdout.on('data', async (data) => {
							console.log(`converting to mp4 stdout: ${data}`);
						});
						mp4.stderr.on('data', async (data) => {
							console.log(`Stderr: ${data}`);
						});
						mp4.on('close', async (code) => {
							console.log(`Converted to mp4 done with code:`, code);
							await fs.unlinkSync(mp4Tmp);
							resolve(true);
						})
					} else {
						console.log('mp4 h264 file ok');
						resolve(true);
					}
				} else {
					console.log('mp3 file ok');
					resolve(true);
				}
			});
		}

		const xorKey = async (folderPath: string, fType) => {
			return new Promise(async (resolve) => {
				const keyPath = `${folderPath}/key.vgmk`;
				const m3u8Path = fType === 'audio' ? `${folderPath}/128p.m3u8` : fType === 'video' ? `${folderPath}/480p.m3u8` : '';
				if (fs.existsSync(m3u8Path) && fs.existsSync(keyPath)) {
					const reader = new M3U8FileParser();
					const segment = await fs.readFileSync(m3u8Path, { encoding: 'utf-8' });
					reader.read(segment);
					const m3u8 = reader.getResult();
					const secret = `VGM-${m3u8.segments[0].key.iv.slice(0, 6).replace("0x", "")}`;
					// get buffer from key and iv
					const code = Buffer.from(secret);
					const key: Buffer = await fs.readFileSync(keyPath);
					const encrypted = bitwise.buffer.xor(key, code, false);
					await fs.writeFileSync(keyPath, encrypted, { encoding: 'binary' });
					console.log('Encrypt key file done');
					resolve(true);
				}
				resolve(false)
			})
		}


		const convertFile = async (file: string, fType: string, pItem) => {
			return new Promise(async (resolve) => {
				let fileInfo: FileInfo = { pid: '', md5: '', name: '', size: 0, duration: '', qm: '', url: '', hash: '', khash: '', isVideo: false, dblevel: 0 };
				let metaData: any = [];
				// get file Info
				metaData = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries format=filename,duration,size,stream_index:stream=avg_frame_rate -of default=noprint_wrappers=1 "${file}"`, { encoding: "utf8" }).split('\n');
				// Then run ffmpeg to start convert
				const duration_stat: string = metaData.filter(name => name.includes("duration=")).toString();
				const duration: number = parseFloat(duration_stat.replace(/duration=/g, ''));
				const minutes: number = Math.floor(duration / 60);
				fileInfo.duration = `${minutes}:${Math.floor(duration) - (minutes * 60)}`;
				fileInfo.size = parseInt(metaData.filter(name => name.includes("size=")).toString().replace('size=', ''));
				fileInfo.name = path.parse(file).name;
				fileInfo.md5 = md5;
				// process filename
				const pureLatin = langToLatin(fileInfo.name);
				fileInfo.url = `${pItem.url}.${pureLatin.toLowerCase().replace(/[\W\_]/g, '-').replace(/-+-/g, "-")}`;

				const outPath = `${tmpDir}/${pureLatin.replace(/\s/g, '')}`;
				fileInfo.isVideo = pItem.isVideo;
				fileInfo.pid = pItem.id;
				fileInfo.dblevel = pItem.dblevel + 1;
				console.log(fileInfo, 'start converting ffmpeg');
				console.log(`'bash', ['ffmpeg-exec.sh', "${file}", "${outPath}", ${fType}]`);
				const hardware = isGPU ? 'gpu' : 'cpu';
				const conversion = spawn('bash', ['ffmpeg-exec.sh', `"${file}"`, `"${outPath}"`, fType, hardware]);
				conversion.stdout.on('data', async (data) => {
					console.log(`conversion stdout: ${data}`);
					const ffmpeg_progress_stat: string[] = data.toString().split('\n');
					if (ffmpeg_progress_stat && fType === 'video') {
						// get fps and total duration
						const fps_stat: string = metaData.filter(name => name.includes("avg_frame_rate=")).toString();
						const converted_frames: string = ffmpeg_progress_stat.filter(name => name.includes("frame=")).toString();
						const multi_stream: string = ffmpeg_progress_stat.filter(name => name.includes("stream_0_1_q=")).toString();
						if (fps_stat && duration_stat && converted_frames && multi_stream) {
							const fps: number = parseInt(fps_stat.match(/\d+/g)[0]) / parseInt(fps_stat.match(/\d+/g)[1]);
							// calculate total frames
							if (fps && duration) {
								const total_frames: number = Math.round(duration * fps);
								const converted_frames_num: number = parseInt(converted_frames.match(/\d+/)[0])
								if (converted_frames_num && total_frames) {
									progression_status = converted_frames_num / total_frames;
								}
							}
						}
						event.sender.send('progression', progression_status);
					} else if (ffmpeg_progress_stat && fType === 'audio') {
						// get converted time
						const time_stat: string = ffmpeg_progress_stat.filter(time => time.includes('out_time_ms=')).toString();
						if (time_stat && duration_stat) {
							const converted_time: number = parseInt(time_stat.replace(/[(out_time_ms=)\.]/g, ''));
							const audio_duration: number = parseInt(duration_stat.replace(/[(duration=)\.]/g, ''));
							// calculate progress
							if (converted_time && audio_duration) {
								progression_status = converted_time / audio_duration;
							}
						}
						event.sender.send('progression', progression_status);
					}
				});

				conversion.stderr.on('data', async (data) => {
					const options = {
						type: 'warning',
						title: 'stdError',
						message: data.toString(),
						detail: 'None expected standard errors occurred, please try again.',
					};
					showMessageBox(options);
					event.sender.send('exec-done');
					console.log(`Stderr: ${data}`);
				});

				conversion.on('close', async (code) => {
					console.log('converted file done with code:', code);
					// encrypt m3u8 key
					try {
						// upload decrypted IPFS -> xorKey -> upload encrypted IPFS
						const secretKey = slice(0, 32, `${fileInfo.url}gggggggggggggggggggggggggggggggg`);
						const decryptedCID: any = await uploadIPFS(outPath, 'decrypted');
						fileInfo.khash = decryptedCID ? CryptoJS.AES.encrypt(decryptedCID, secretKey).toString() : '';
						await xorKey(outPath, fType);
						const encryptedCID: any = await uploadIPFS(outPath, 'encrypted');
						fileInfo.hash = encryptedCID ? CryptoJS.AES.encrypt(encryptedCID, secretKey).toString() : '';
						// upload converted to s3
						const VGM = fType === 'audio' ? 'VGMA' : fType === 'video' ? 'VGMV' : '';
						console.log('start uploading');

						const upConvertedPath = `${encryptedConf.name}:${encryptedConf.bucket}/${VGM}/${fileInfo.url.replace(/\./g, '\/')}`;
						await rcloneSync(`${outPath}`, upConvertedPath, encryptedConf.path);
						// upload done -> delete converted folder
						console.log('updated fileInfo', fileInfo);
						await fs.rmdirSync(outPath, { recursive: true });
						console.log('removed converted folder');
						// create database
						event.sender.send('create-database', fileInfo);
						resolve(fileInfo);
					} catch (error) {
						console.log('error:', error);
					}
				});
			});
		}

		// let files: string;
		// let totalFiles: number = 0;
		// let convertedFiles: number = 0;
		let progression_status: number = 0;
		// let fileType: string;
		// Get total input file count 
		// if (fileOnly) {
		// 	files = inputFile;
		// } else {
		// 	files = execSync(`find '${inputFile}' -regextype posix-extended -regex '.*.(mp4|mp3)'`, { encoding: "utf8" }).split('\n');
		// 	files.pop();
		// }
		// totalFiles = files.length;
		const fileType = pItem.isVideo ? 'video' : 'audio';

		return new Promise(async (resolve, reject) => {
			const fileOk = await checkMP4(inputFile, fileType); // audio dont need check MP4
			if (fileOk) {
				// convert and up encrypted and database
				const checkNonSilence = await execSync(`ffmpeg -i "${inputFile}" 2>&1 | grep Audio | awk '{print $0}' | tr -d ,`, { encoding: 'utf8' });
				const fStat = checkNonSilence ? fileType : 'videoSilence';
				await convertFile(inputFile, fStat, pItem);
				resolve(true);
			} else {
				console.log(`file data error: cannot read - ${inputFile}`);
				resolve(false)
			}
		})

	})

	// Stop conversion process when button onclick
	ipcMain.handle('stop-convert', (event) => {
		//get ffmpeg-exec.sh PID and run command to kill it then kill ffmpeg
		let child = spawn('pgrep', ['-f', 'ffmpeg-exec.sh'], { detached: true });
		child.stdout.on('data', (data) => {
			let ffmpeg_bash_pid = data.toString().trim();
			let killcmd = `kill ${ffmpeg_bash_pid} && killall ffmpeg`;
			exec(killcmd, (error, stdout, stderr) => {
				if (error) {
					console.log(`Error: ${error}`);
					const options = {
						type: 'error',
						title: 'Error',
						message: 'Error cancelling conversion',
						detail: 'None expected errors occured, please try again.',
					};
					showMessageBox(options);
				} else if (stderr) {
					console.log(`Stderr: ${stderr}`);
					const options = {
						type: 'error',
						title: 'Error',
						message: 'Error cancelling conversion',
						detail: 'None expected standard errors occured, please try again.',
					};
					showMessageBox(options);
				} else {
					console.log(`Stdout: ${stdout}`);
					const options = {
						type: 'info',
						title: 'Done',
						message: 'Cancellation',
						detail: 'Your conversion have been cancelled.',
					};
					showMessageBox(options);
				}
			});
		});
		child.stderr.on('data', (data) => { console.log(`stderr: ${data}`) });
		child.on('error', (error) => { console.log(`error: ${error}`) });
		child.on('exit', (code, signal) => {
			if (code) console.log(`Process exit with code: ${code}`)
			if (signal) console.log(`Process killed with signal: ${signal}`)
			console.log(`Done ✅`)
		});

	})

}