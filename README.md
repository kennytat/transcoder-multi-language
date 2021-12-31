# VGM-TRANSCODER

## Imstruction

edit corresponding 'prefixPath', 'start' & 'end' conversting point in function test() in database.page.ts file then:

`yarn install yarn start.electron.vgm`

## Intant conversion upload process

1/ Get mp3 file path from s3 bucket:vgmorigin (loop through VGMA.txt)
2/ Rename vietnamese path then upload to s3 bucket:vgmencrypted (find corresponding .ini in database/renamed folder)
3/ Get parent json info from pre-exported API (find corresponding .json in database/API folder)
4/ Start conversion ("inpath from s3:vgmorigin", "outpath to 'database/converted' folder")
5/ Get basic file info (pid, name, url, duration, size,...)
6/ Upload converted file to s3 bucket:vgmencrypted (Using file.url path)
7/ Upload IPFS (through 'local docker node' or 'IPFS gateway')
8/ Update Qm to file info -> Store to Sqlite -> update parent isLeaf = true

## Requirements

1/ Openssl
2/ FFmpeg build:
update apt - sudo apt-get update
install basic - sudo apt-get install git curl libx264-dev libx265-dev libmp3lame-dev libfdk-aac-dev build-essential yasm cmake libtool libc6 libc6-dev unzip wget libnuma1 libnuma-dev
nvdia driver - ubuntu-drivers devices (look for recommended version)
sudo ubuntu-drivers autoinstall && sudo apt install nvidia-driver-470 && sudo reboot
cuda driver
sudo apt install nvidia-cuda-toolkit
'https://docs.nvidia.com/video-technologies/video-codec-sdk/ffmpeg-with-nvidia-gpu/'
nv-codec-header version at https://github.com/FFmpeg/nv-codec-headers/branches/all -> ex: "git clone --branch sdk/10.0 https://github.com/FFmpeg/nv-codec-headers.git"
cd nv-codec-headers && sudo make install && cd -
git clone https://git.ffmpeg.org/ffmpeg.git ffmpeg/
./configure --enable-libmp3lame --enable-libfdk-aac --enable-libx264 --enable-libx265 --enable-opengl --enable-nvdec --enable-gpl --enable-cuda --enable-cuvid --enable-nvenc --enable-nonfree --enable-libnpp --extra-cflags=-I/usr/local/cuda/include --extra-ldflags=-L/usr/local/cuda/lib64
make -j 8
sudo make install
3/ Rclone - 'https://rclone.org/install/'
4/ Uplink - 'https://docs.storj.io/dcs/downloads/download-uplink-cli'
5/ Docker(optional) for building IPFS local node
6/ database.zip - 'extract to local machine' then mount rclone bucket vgmorigin/origin to database/origin

## Docker

### BUILD COMMAND

docker build -t ipfs/image .

### DEV RUN COMMAND

docker run --name ipfsContainer -p 4001:4001 -p 4001:4001/udp -p 127.0.0.1:8080:8080 -p 127.0.0.1:5001:5001 --rm --privileged -e 'AWSACCESSKEYID=jurwqqza4a5feebwaa3ghxgxhqqq' -e 'AWSSECRETACCESSKEY=j2zd5ragcs6ex27enxarxqaihs53adhssajcqkxiyn66xdp3qap6w' -e 'ENDPOINT_URL=https://gateway.ap1.storjshare.io' -e 'S3_BUCKET=vgm-ipfs' -e 'MOUNT_POINT=/var/s3' -e 'IAM_ROLE=none' -v /PATH/TO/YOUR/PROJECT/tv-ipfs-s3/custom:/custom -it ipfs/image

docker run --name ipfsContainer -p 4001:4001 -p 4001:4001/udp -p 127.0.0.1:8080:8080 -p 127.0.0.1:5001:5001 --rm --privileged -e 'AWSACCESSKEYID=jurwqqza4a5feebwaa3ghxgxhqqq' -e 'AWSSECRETACCESSKEY=j2zd5ragcs6ex27enxarxqaihs53adhssajcqkxiyn66xdp3qap6w' -e 'ENDPOINT_URL=https://gateway.ap1.storjshare.io' -e 'S3_BUCKET=vgm-ipfs' -e 'MOUNT_POINT=/var/s3' -e 'IAM_ROLE=none' -it ipfs/image
