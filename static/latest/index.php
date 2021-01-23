<?php
$json = file_get_contents(__DIR__ . '/../comic/index.json');
$comics = json_decode($json, true);
header('Location: /comic/' . $comics[0]);
?>
