import { Component, NgZone } from '@angular/core';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'vgm-ipfs',
  templateUrl: 'ipfs.page.html',
  styleUrls: ['ipfs.page.scss'],
})
export class IpfsPage {
  isConnected: boolean = false;
  isLoading: boolean = false;
  stdOut: any = '';
  ipfsConfig = {
    host: 'http://ipfs-sgp.hjm.bid', // 'http://ipfs-sgp.hjm.bid', // '127.0.0.1',
    apiPort: '5001',
    swarmPort: '4001',
    gatewayPort: '8080',
    accessKey: 'jurwqqza4a5feebwaa3ghxgxhqqq',
    secretKey: 'j2zd5ragcs6ex27enxarxqaihs53adhssajcqkxiyn66xdp3qap6w',
    endPoint: 'https://gateway.ap1.storjshare.io',
    bucket: 'vgm-ipfs',
    image: 'ipfs/image',
    container: 'ipfsContainer'
  }
  httpApiConfig = {
    url: 'http://ipfs-sgp.hjm.bid/api/v0'
    // host: 'ipfs-sgp.hjm.bid',  // 'ipfs-sgp.hjm.bid', // '127.0.0.1',
    // port: 80, // 80 or 5001
    // protocol: 'http',
    // apiPath: '/api/v0',
    // timeout: '6h'
  }
  constructor(
    private _electronService: ElectronService,
    private zone: NgZone
  ) { }

  ipfsConnect() {
    this.stdOut = '';
    this.isLoading = true;
    if (this._electronService.isElectronApp) {
      this._electronService.ipcRenderer.invoke('connect-ipfs', this.isConnected, this.ipfsConfig);
      this._electronService.ipcRenderer.on('ipfs-response', (event, connection, res) => {
        this.zone.run(() => {
          const log = res.split('\n');
          if (connection) {
            this.stdOut += res;
            if (log[log.length - 2] === 'Daemon is ready' || log[0] === 'Connected to local IPFS daemon' || log[0] === 'Connected to IPFS gateway daemon') {
              this.isConnected = connection;
              this.isLoading = false;
              this._electronService.ipcRenderer.invoke('ipfs-ready', this.httpApiConfig);
            }
          } else {
            this.isConnected = connection;
            this.isLoading = false;
            this.stdOut = res;
          }

        })

      })


    }
  }


}
