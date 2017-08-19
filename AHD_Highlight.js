// ==UserScript==
// @name         AHD Highlight
// @namespace    http://tampermonkey.net/
// @grant        none
// @match        https://awesome-hd.me/torrents.php*
// @exclude      https://awesome-hd.me/torrents.php?id=*
// @run-at       document-end
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// @version      0.3
// @author       jhk
// @description  The scripts highlights and differentiate torrents which are seeding/snatched/leeching on one's client by different colors. Total 3 Styles - (1) Add colorized text after torrent. (2) Add colorized text with background after torrent. (3) Colorize torrent title completely.

// ==/UserScript==

// ==/UserScript==
(function() {
	'use strict';

	var showSpinner = true; // Display the loading spinner during torrent grabbing
	var style = 3; // 1 = Add colorized text after torrent, 2 = Add colorized text with background after torrent, 3 = Colorize torrent title completely
	var seedHex = '33cc00';
	var leechHex = 'cc66cc';
	var snatchedHex = 'ff9933';
	var torrents = []; // This will be used for the list of torrents
	var singleTorrent = [];
	var links = document.links; // Grab all links to check
	var totalPages = 0;
	var currentPage = 1;
	var statusColumn = 6;

	// Loading spinner, shown only when snatched list is being updated
	if (showSpinner) $("<style>").prop("type", "text/css").html(`.snatched-noty{bottom:20px;right:20px;position:fixed;width:310px;height:auto;margin:0;padding:0}.snatched-title{position:relative;margin:auto;text-align:center}#floatingCirclesG{position:relative;width:90px;height:90px;margin:auto;transform:scale(.6);-o-transform:scale(.6);-ms-transform:scale(.6);-webkit-transform:scale(.6);-moz-transform:scale(.6)}.f_circleG{position:absolute;background-color:#fff;height:16px;width:16px;border-radius:8px;-o-border-radius:8px;-ms-border-radius:8px;-webkit-border-radius:8px;-moz-border-radius:8px;animation-name:f_fadeG;-o-animation-name:f_fadeG;-ms-animation-name:f_fadeG;-webkit-animation-name:f_fadeG;-moz-animation-name:f_fadeG;animation-duration:1.2s;-o-animation-duration:1.2s;-ms-animation-duration:1.2s;-webkit-animation-duration:1.2s;-moz-animation-duration:1.2s;animation-iteration-count:infinite;-o-animation-iteration-count:infinite;-ms-animation-iteration-count:infinite;-webkit-animation-iteration-count:infinite;-moz-animation-iteration-count:infinite;animation-direction:normal;-o-animation-direction:normal;-ms-animation-direction:normal;-webkit-animation-direction:normal;-moz-animation-direction:normal}#frotateG_01{left:0;top:36px;animation-delay:.45s;-o-animation-delay:.45s;-ms-animation-delay:.45s;-webkit-animation-delay:.45s;-moz-animation-delay:.45s}#frotateG_02{left:10px;top:10px;animation-delay:.6s;-o-animation-delay:.6s;-ms-animation-delay:.6s;-webkit-animation-delay:.6s;-moz-animation-delay:.6s}#frotateG_03{left:36px;top:0;animation-delay:.75s;-o-animation-delay:.75s;-ms-animation-delay:.75s;-webkit-animation-delay:.75s;-moz-animation-delay:.75s}#frotateG_04{right:10px;top:10px;animation-delay:.9s;-o-animation-delay:.9s;-ms-animation-delay:.9s;-webkit-animation-delay:.9s;-moz-animation-delay:.9s}#frotateG_05{right:0;top:36px;animation-delay:1.05s;-o-animation-delay:1.05s;-ms-animation-delay:1.05s;-webkit-animation-delay:1.05s;-moz-animation-delay:1.05s}#frotateG_06{right:10px;bottom:10px;animation-delay:1.2s;-o-animation-delay:1.2s;-ms-animation-delay:1.2s;-webkit-animation-delay:1.2s;-moz-animation-delay:1.2s}#frotateG_07{left:36px;bottom:0;animation-delay:1.35s;-o-animation-delay:1.35s;-ms-animation-delay:1.35s;-webkit-animation-delay:1.35s;-moz-animation-delay:1.35s}#frotateG_08{left:10px;bottom:10px;animation-delay:1.5s;-o-animation-delay:1.5s;-ms-animation-delay:1.5s;-webkit-animation-delay:1.5s;-moz-animation-delay:1.5s}@keyframes f_fadeG{0%{background-color:#000}100%{background-color:#fff}}@-o-keyframes f_fadeG{0%{background-color:#000}100%{background-color:#fff}}@-ms-keyframes f_fadeG{0%{background-color:#000}100%{background-color:#fff}}@-webkit-keyframes f_fadeG{0%{background-color:#000}100%{background-color:#fff}}@-moz-keyframes f_fadeG{0%{background-color:#000}100%{background-color:#fff}}`).appendTo("head");

	if (((new Date()) - new Date(localStorage.getItem('lastChecked'))) > 60 * 60 * 1000 || !localStorage.getItem('lastChecked')) { // Only runs once per hour

		// Show the loading spinner
		if (showSpinner) $("body").append(`<div id="snatchedLoader" class="snatched-noty"><div id="floatingCirclesG"><div class="f_circleG" id="frotateG_01"></div><div class="f_circleG" id="frotateG_02"></div><div class="f_circleG" id="frotateG_03"></div><div class="f_circleG" id="frotateG_04"></div><div class="f_circleG" id="frotateG_05"></div><div class="f_circleG" id="frotateG_06"></div><div class="f_circleG" id="frotateG_07"></div><div class="f_circleG" id="frotateG_08"></div></div><div class="snatched-title">Updating snatched list...</div></div>`);

		$.ajax({
			url: 'https://awesome-hd.me/user.php?action=torrenthistory',
			success: function(data) {
				var $page = $(data);
				var grabPages = $page.find("a");
				totalPages = grabPages[grabPages.length - 2].toString().replace(/[^0-9]/g, '');
				if ($page.find("tr").eq(0).find("td").eq(6).text() != 'Status') statusColumn = 7; // Check whether the 'Bonus Points Per Hour' (HD-Maniac+) column exists
				getTorrents();
			}
		});
	} else {
		checkStatus();
	}

	function getTorrents() {
		$.ajax({
			url: 'https://awesome-hd.me/user.php?page=' + currentPage + '&action=torrenthistory',
			success: function(data) {
				var $page = $(data);
				var getTorrentsStatus = function() {
					$page.find('tr').each(function (i) {
						if ($page.find("tr").eq(i).find("td").eq(0).html().indexOf('Deleted') == -1) {
							var torrentID = jQuery($page.find("tr").eq(i).find("td").eq(0).html()).find('a').attr('href').split('torrentid=');
							if (torrentID[1]) {
								singleTorrent = {};
								singleTorrent.torrentID = torrentID[1];
								singleTorrent.status = $page.find("tr").eq(i).find("td").eq(statusColumn).text();
								torrents.push(singleTorrent);
							}
						}
					});
				};


				$.when(getTorrentsStatus()).done(function() {
					currentPage++;
					if (currentPage <= totalPages) {
						getTorrents();
					} else {
						localStorage.setItem('torrents', JSON.stringify(torrents));
						localStorage.setItem('lastChecked', new Date());
						if (showSpinner) $('#snatchedLoader').remove(); // Remove the loading spinner
						checkStatus();
					}
				});

			}

		});


	}

	function checkStatus() {
		torrents = JSON.parse(localStorage.getItem('torrents'));
		var totalTorrents = torrents.length;
		$.each(links, function(index, singleLink) {
			if (singleLink.toString().split('torrentid=')[1]) {
				var checkTorrentID = singleLink.toString().split('torrentid=')[1];
				$.each(torrents, function(index, singleTorrent) {
					if (checkTorrentID == singleTorrent.torrentID) {
						if (style == 1 && singleTorrent.status == 'Seeding') {
							singleLink.innerHTML = links[i].innerHTML + ' ' + '<span style="padding: 0; color: #' + seedHex + '">' + singleTorrent.status + '</span>';
						} else if (style == 2 && singleTorrent.status == 'Seeding') {
							singleLink.innerHTML = links[i].innerHTML + ' ' + '<span style="padding: 0; color: #fff; background-color: #' + seedHex + '">' + singleTorrent.status + '</span>';
						} else if (style == 3 && singleTorrent.status == 'Seeding') {
							singleLink.style.color = '#' + seedHex;
						} else if (style == 1 && singleTorrent.status == 'Leeching') {
							singleLink.innerHTML = links[i].innerHTML + ' ' + '<span style="padding: 0; color: #' + leechHex + '">' + singleTorrent.status + '</span>';
						} else if (style == 2 && singleTorrent.status == 'Leeching') {
							singleLink.innerHTML = links[i].innerHTML + ' ' + '<span style="padding: 0; color: #fff; background-color: #' + leechHex + '">' + singleTorrent.status + '</span>';
						} else if (style == 3 && singleTorrent.status == 'Leeching') {
							singleLink.style.color = '#' + leechHex;
						} else if (style == 1 && singleTorrent.status == 'Complete') {
							singleLink.innerHTML = links[i].innerHTML + ' ' + '<span style="padding: 0; color: #' + snatchedHex + '">' + singleTorrent.status + '</span>';
						} else if (style == 2 && singleTorrent.status == 'Complete') {
							singleLink.innerHTML = links[i].innerHTML + ' ' + '<span style="padding: 0; color: #fff; background-color: #' + snatchedHex + '">' + singleTorrent.status + '</span>';
						} else if (style == 3 && singleTorrent.status == 'Complete') {
							singleLink.style.color = '#' + snatchedHex;
						}
					}
				});
			}
		});

	}



})

();
