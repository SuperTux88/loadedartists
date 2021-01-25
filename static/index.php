<?php
$json = file_get_contents(__DIR__ . '/archives/index.json');
$comics = json_decode($json, true);
$comic = $_SERVER["REQUEST_URI"] == "/random" ? $comics[array_rand($comics)] : $comics[0];
header('Location: /comic/' . $comic . '/');
?>
