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
  end
end
