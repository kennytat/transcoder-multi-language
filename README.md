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
install basic - sudo apt-get install git curl libx264-dev libx265-dev libmp3lame-dev libfdk-aac-dev build-essential yasm cmake libtool libc6 libc6-dev unzip wget libnuma1 libnuma-dev
nvdia driver - ubuntu-drivers devices (look for recommended version)
sudo ubuntu-drivers autoinstall && sudo apt install nvidia-driver-470 && sudo reboot
cuda driver
- sudo apt install nvidia-cuda-toolkit
nv-codec-header version at https://github.com/FFmpeg/nv-codec-headers/branches/all -> ex: "git clone --branch sdk/10.0 https://github.com/FFmpeg/nv-codec-headers.git"
cd nv-codec-headers && sudo make install && cd -
git clone https://git.ffmpeg.org/ffmpeg.git ffmpeg/
./configure --enable-libmp3lame --enable-libfdk-aac --enable-libx264 --enable-libx265 --enable-opengl --enable-nvdec --enable-gpl --enable-cuda --enable-cuvid --enable-nvenc --enable-nonfree --enable-libnpp --extra-cflags=-I/usr/local/cuda/include --extra-ldflags=-L/usr/local/cuda/lib64
make -j 8
sudo make install
```

- 3/ Rclone - 'https://rclone.org/install/'
