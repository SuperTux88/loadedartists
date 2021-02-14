<?php
$json = file_get_contents(__DIR__ . '/archives/index.json');
$comics = json_decode($json, true);

if ($_SERVER["REQUEST_URI"] === "/random") {
  $referer = $_SERVER["HTTP_REFERER"];
  if (parse_url($referer, PHP_URL_HOST) === $_SERVER["HTTP_HOST"]) {
    if (preg_match('/\\/comic\\/([^\\/]+)/', parse_url($referer, PHP_URL_PATH), $matches) === 1) {
      if (($del_key = array_search($matches[1], $comics)) !== false) {
        unset($comics[$del_key]);
      }
    }
  }
  $comic = $comics[array_rand($comics)];
} else {
  $comic = $comics[0];
}

header('Location: /comic/' . $comic . '/');
?>
