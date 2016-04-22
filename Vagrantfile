# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.network "forwarded_port", guest: 8872, host: 8872
  config.ssh.forward_agent = true
  config.vm.synced_folder ".", "/vagrant"
  config.vm.provision :shell, path: "scripts/provision.sh"
  config.vm.provider "virtualbox" do |v|
    v.memory = 2048
    v.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/v-root", "1"]
    config.vm.synced_folder "/usr/local/lib/node_modules/granary", "/vagrant/node_modules/granary", :owner => "www-data", :group => "www-data"
  end
end
