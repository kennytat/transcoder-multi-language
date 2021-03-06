# VGM-TRANSCODER

## Instruction

```
npm install
npm start.electron.vgm
```

## Requirements

- 1/ Openssl
- 2/ FFmpeg build: https://docs.nvidia.com/video-technologies/video-codec-sdk/ffmpeg-with-nvidia-gpu/

```
update apt - sudo apt-get update
install basic - sudo apt-get install git curl libx264-dev libx265-dev libwebp-dev libmp3lame-dev libfdk-aac-dev build-essential yasm cmake libtool libc6 libc6-dev unzip wget libnuma1 libnuma-dev webp
nvdia driver - ubuntu-drivers devices (look for recommended version)
sudo ubuntu-drivers autoinstall && sudo apt install nvidia-driver-470 && sudo reboot
cuda driver
- sudo apt install nvidia-cuda-toolkit
nv-codec-header version at https://github.com/FFmpeg/nv-codec-headers/branches/all -> ex: "git clone --branch sdk/10.0 https://github.com/FFmpeg/nv-codec-headers.git"

cd ~ && \
git clone --branch sdk/10.0 https://github.com/FFmpeg/nv-codec-headers.git && \
git clone https://git.ffmpeg.org/ffmpeg.git && \
cd ~/nv-codec-headers && sudo make install && \
cd ~/ffmpeg && \
./configure --enable-libmp3lame --enable-libfdk-aac --enable-libx264 --enable-libx265 --enable-libwebp --enable-opengl --enable-nvdec --enable-gpl --enable-cuda --enable-cuvid --enable-nvenc --enable-nonfree --enable-libnpp --extra-cflags=-I/usr/local/cuda/include --extra-ldflags=-L/usr/local/cuda/lib64 && \
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

- 3/ Rclone - 'https://rclone.org/install/'
```
