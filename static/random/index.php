<?php
$json = file_get_contents(__DIR__ . '/../comic/index.json');
$comics = json_decode($json, true);
$comic = $comics[array_rand($comics)];
header('Location: /comic/' . $comic);
?>
