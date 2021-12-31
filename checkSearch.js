const fs = require('fs');
const {  exec } = require('child_process');

let nIntervId;
let i =0;
const checkData = async () => {
  if (!nIntervId) {
    nIntervId = setInterval(execFn, 2000);
  }

	function execFn() {
		exec(`curl -H "X-Meili-API-Key: KYV2oMHSE5G2p9ZXwUGH3CfWpaXB1CF5" -X GET 'https://search.hjm.bid/indexes/VGMV'`,  (error, stdout, stderr) => { 
			var today = new Date();
			var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
			var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
			i++;
			console.log(`\n${stdout}\n${date}\n${time}\n${i}times`);
			if (error) {console.log(error)}
			if (stderr) {console.log(stderr);}
			if (stdout && JSON.parse(stdout).uid !== 'VGMV' ) {
				fs.appendFileSync(`/home/vgm/Desktop/meilidata.txt`, `\n${stdout.toString()}\n${date}\n${time}`);
				clearInterval(nIntervId);
				// release our intervalID from the variable
				nIntervId = null; 

			}
		})
	}
}


const main = async () => { 
	await checkData();
}
main();