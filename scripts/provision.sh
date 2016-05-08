sudo apt-get -y install redis-server;

sudo apt-get -y update;
sudo apt-get -y install build-essential libssl-dev;

curl https://raw.githubusercontent.com/creationix/nvm/v0.16.1/install.sh | sh;
source ~/.profile;

nvm install 4;

npm install npm@3;
sudo apt-get install git;

// sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000

