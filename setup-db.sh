#!/bin/bash

database=tellordb
user=telloruser
passwd=tellorpasswd
host=localhost

mysql -e "CREATE DATABASE ${database}"
mysql $database -e "CREATE USER '${user}'@'${host}' IDENTIFIED BY '${passwd}'"
mysql $database -e "GRANT ALL PRIVILEGES ON ${database}.* TO '${user}'@'${host}'"

mysql $database -e "CREATE TABLE `boards`(`id` binary(16) NOT NULL, `name` varchar(127) NOT NULL, `bgimg` varchar(1023) CHARACTER SET ascii COLLATE ascii_bin, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin"

mysql $database -e "CREATE TABLE `lists`(`board` binary(16) NOT NULL, `id` binary(16) NOT NULL, `color` char(6) CHARACTER SET ascii COLLATE ascii_bin, `name` varchar(1023) NOT NULL, `ordr` int(10) unsigned NOT NULL, KEY `listsBoardIdx` (`board`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin"

mysql $database -e "CREATE TABLE `cards`(`board` binary(16) NOT NULL, `list` binary(16) NOT NULL, `id` binary(16) NOT NULL, `parent` char(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, `title` varchar(1023) NOT NULL, `tags` varchar(127) CHARACTER SET ascii COLLATE ascii_bin, `cdate` datetime NOT NULL DEFAULT current_timestamp(), `mdate` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(), `description` text, KEY `cardsBoardIdx` (`board`,`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin"

mysql $database -e "CREATE TABLE `archive`(`board` binary(16) NOT NULL, `list` binary(16) NOT NULL, `id` binary(16) NOT NULL, `parent` char(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, `title` varchar(1023) NOT NULL, `tags` varchar(127) CHARACTER SET ascii COLLATE ascii_bin, `cdate` datetime NOT NULL, `mdate` datetime NOT NULL, `description` text) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin"

mysql $database -e "CREATE TABLE `history`(`board` binary(16) NOT NULL, `cardid` binary(16) NOT NULL, `type` binary(3) NOT NULL, `change_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `patch` blob, INDEX historyIdx (`board`,`cardid`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin"

