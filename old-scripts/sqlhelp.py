#!/usr/bin/python

import _mysql
import datetime
import time
import sys

def invalidArgv():
	print ( 'Error: invalid argument' )
	print ( 'Example:')
	print ( '	./sqlhelp.pl -id 3')
	print ( '	./sqlhelp.pl -key	(It will show all key list)')
	print ( '	./sqlhelp.pl -key join')
	exit()

if(len(sys.argv) < 2):
	invalidArgv()

if len(sys.argv) == 2 and sys.argv[1] != '-key' :
	invalidArgv()

if sys.argv[1] not in ['-id', '-key'] :
	invalidArgv()

def escapeSqlString(s):
	return s.replace("'", "''")

def getHelp():
	con =  _mysql.connect('localhost', 'root', 'toor')
	con.query("USE mysql")

	if len(sys.argv) == 2 :
		key_list_query = "SELECT help_keyword_id, name FROM help_keyword"
		con.query(key_list_query)
		result = con.store_result()
		if result.num_rows() == 0 :
			print ("No result found")
		else :
			print ("id\tname")
			while True :
				r=result.fetch_row()
				if len(r) == 0 : break
				print(r[0][0] + "\t" + r[0][1]) 
			
	else:
		help_query = "SELECT ht.description, ht.example, ht.url, ht.name FROM help_topic ht LEFT JOIN help_relation hr ON ht.help_topic_id = hr.help_topic_id LEFT JOIN help_keyword hk ON hk.help_keyword_id = hr.help_keyword_id WHERE ";
		if sys.argv[1] == '-id' :
			help_query += "hk.help_keyword_id ='" + escapeSqlString(sys.argv[2]) + "'"
		else:
			help_query += "(hk.name  = '" + escapeSqlString(sys.argv[2]) + "' OR ht.name = '" + escapeSqlString(sys.argv[2]) + "')"

		con.query(help_query);
		
		result = con.store_result()

		if result.num_rows() == 0 :
			print ("No result found")
		else :
			bold = "\033[1m"
			reset_text = "\033[0;0m"
			
			while True :
				r=result.fetch_row()
				if len(r) == 0 : break
				print ('')
				print bold + "---- " + r[0][3] + " ----" + reset_text
				print ('')
				print bold + "Description:" + reset_text
				print r[0][0]
				print ('')
				print bold + "Example:" + reset_text
				print r[0][1]
				print ('')
				print bold + "url: " + reset_text + r[0][2]
	con.close()

getHelp()


