# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.network "forwarded_port", guest: 8872, host: 8872
  config.ssh.forward_agent = true
  config.vm.synced_folder ".", "/vagrant"
end
