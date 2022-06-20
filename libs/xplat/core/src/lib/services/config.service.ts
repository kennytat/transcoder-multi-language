import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { LocalforageService } from '../services/localforage.service';
import { S3Conf } from '../models';
import * as pAll from 'p-all';
import { ElectronService } from 'ngx-electron';


@Injectable({
	providedIn: 'root',
})
export class ConfigService {
	warehouseConf: S3Conf = {
		id: 'warehouse',
		status: false,
		name: '',
		type: '',
		provider: '',
		access_key_id: '',
		secret_access_key: '',
		endpoint: '',
		acl: '',
		bucket: ''
	};
	warehouseConf$: BehaviorSubject<S3Conf> = new BehaviorSubject<S3Conf>(this.warehouseConf);
	encryptedConf: S3Conf = {
		id: 'encrypted',
		status: false,
		name: '',
		type: '',
		provider: '',
		access_key_id: '',
		secret_access_key: '',
		endpoint: '',
		acl: '',
		bucket: ''
	};
	encryptedConf$: BehaviorSubject<S3Conf> = new BehaviorSubject<S3Conf>(this.encryptedConf);
	ipfsAPIGateway = {
		id: 'ipfs',
		status: false,
		name: '',
		gateway: '',
	};
	ipfsAPIGateway$: BehaviorSubject<{}> = new BehaviorSubject<{}>(this.ipfsAPIGateway);
	searchGateway = {
		id: 'search',
		status: false,
		name: '',
		database: '',
		gateway: '',
		key: ''
	};
	searchGateway$: BehaviorSubject<{}> = new BehaviorSubject<{}>(this.ipfsAPIGateway);
	dnsGateway = {
		id: 'dns',
		status: false,
		name: '',
		domain: '',
		cf_gateway: '',
		cf_zone_id: '',
		cf_dns_id: '',
		cf_email: '',
		cf_api: '',
	};
	dnsGateway$: BehaviorSubject<{}> = new BehaviorSubject<{}>(this.dnsGateway);

	configs = [this.warehouseConf, this.encryptedConf, this.ipfsAPIGateway, this.searchGateway, this.dnsGateway];
	configs$ = [this.warehouseConf$, this.encryptedConf$, this.ipfsAPIGateway$, this.searchGateway$, this.dnsGateway$];
	confStat = false;
	constructor(
		private _localForage: LocalforageService,
		private _electronService: ElectronService,
	) {
		this.warehouseConf$.subscribe((conf: S3Conf) => {
			this.warehouseConf = conf;
		});
		this.encryptedConf$.subscribe((conf: S3Conf) => {
			this.encryptedConf = conf;
		});
		this.ipfsAPIGateway$.subscribe((conf: any) => {
			this.ipfsAPIGateway = conf;
		});
		this.searchGateway$.subscribe((conf: any) => {
			this.searchGateway = conf;
		});
		this.dnsGateway$.subscribe((conf: any) => {
			this.dnsGateway = conf;
		});


	}

	async confCheck() {
		return new Promise(async (resolve) => {
			try {
				let promises = [];
				for (let i = 0; i < this.configs.length; i++) {
					promises.push(this._localForage.get(this.configs[i].id).then(
						async (result) => {
							if (result) {
								this.configs[i] = result;
								const connStatus = await this.connCheck(this.configs[i]);
								this.configs[i].status = connStatus as boolean;
								this.configs$[i].next(this.configs[i]);
								return connStatus;
							} else {
								await this._localForage.set(this.configs[i].id, this.configs[i]);
								return result;
							}
						}))
				}
				const confValid = await pAll(promises, { concurrency: 3 });
				if (confValid) {
					this.confStat = true;
					resolve(true);
				}
				return false;
			} catch (error) {
				resolve(false);
			}
		})
	}

	async connCheck(config) {
		return new Promise((resolve) => {
			if (this._electronService.isElectronApp) {
				this._electronService.ipcRenderer.invoke('check-conf', config).then((conf) => {
					console.log(`connection of ${config.id}:`, conf);
					resolve(conf)
				})
			}
		})
	}

}
