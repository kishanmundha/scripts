<?php

require_once '../sqlConfig.php';
require_once '../mysql.class.php';

$db = new mysql_class();

?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title></title>
	<style>
		body {font-family: Tahoma; font-size: 10pt;}
                h2 {background-color: #EEE; margin-top: 0px; padding-left: 10px; padding-top: 2px; padding-bottom: 2px; font-size: 17px;}
                .helpDiv {border: 1px solid #EEE; margin-top: 10px;}
                .helpContent { padding: 0 15px 5px;}
                pre{font-family: Consolas;}
                p.desc {text-align: justify;}
	</style>
</head>
<body>
<?php

if($db->open_connection(HOST, SQL_USERNAME, SQL_PASSWORD, "mysql") === false) {
    die ($db->last_error);
}

$query = "SELECT * FROM help_topic";
if(isset($_GET['id']) && $_GET['id'] !== '') $query .= " WHERE help_topic_id=" . $_GET['id'];
$query .= " ORDER BY help_category_id";
if($db->execute_reader($query) === false) die ($db->last_query . "<br/>" . $db->last_error);

foreach($db->result as $row) {
    echo "<div class='helpDiv'>";
    echo "<h2>" . $row[1] . "</h2>";
    echo "<div class='helpContent'>";
    echo "<h3>Description:</h3>";
    echo "<p class='desc'>" . $row[3] . "</p>";
    echo "<h3>Example:</h3>";
    echo "<pre>" . $row[4] . "</pre>";
    echo "<p>For more info: <a href='" . $row[5] . "'>" . $row[5] . "</a><p>";
    echo "</div>";
    echo "</div>";
}


$db->close_connection();


?>
</body>
</html>