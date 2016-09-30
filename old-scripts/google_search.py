#!/usr/bin/python
#
#  url of google search

import sys
import re
import urllib2

def g_error():
	print 'Error'

def g_url(search, max_result):
	search = search.replace(' ', '+')
	urls = []
	while len(urls) < max_result:
		opener = urllib2.build_opener()
		opener.addheaders = [('User-agent', 'Mozilla/5.0')]
		url = 'http://www.google.com/search?q=' + search + '&safe=on'
		if len(urls) != 0 : url += '&start=' + str(len(urls))
		response = opener.open(url)
		response = response.read()
					
		uList = re.findall('<li class=\"g\"><h3 class=\"r\"><a href=\"/url\?q=([^"&]+)', response, re.IGNORECASE)
		urls.extend(uList)
		
		for x in uList:
			print x
		
		if len(uList) == 0 : break

if len(sys.argv) < 2:
	g_error()
	exit()

if len(sys.argv) == 2 : g_url(sys.argv[1], 10)
else : g_url(sys.argv[1], int(sys.argv[2]))
