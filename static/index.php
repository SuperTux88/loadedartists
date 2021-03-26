<?php

function redirect_to_page_in_section($pages, $sections, callable $selector) {
  do {
    $found_key = $selector($pages);
    $found_page = $pages[$found_key];
    unset($pages[$found_key]);
  } while (!in_array($found_page['section'], $sections));
  header('Location: ' . $found_page['url']);
}

$pages = json_decode(file_get_contents(__DIR__ . '/index.json'), true);

switch ($_SERVER["REQUEST_URI"]) {
  case "/random":
    $referer = $_SERVER["HTTP_REFERER"];
    if (parse_url($referer, PHP_URL_HOST) === $_SERVER["HTTP_HOST"]) {
      if (preg_match('/\\/comic\\/([^\\/]+)/', parse_url($referer, PHP_URL_PATH), $matches) === 1) {
        if (($del_key = array_search($matches[1], $pages)) !== false) {
          unset($pages[$del_key]);
        }
      }
    }
    redirect_to_page_in_section($pages, array("comic"), function ($pages) {
      return array_rand($pages);
    });
    break;
  case "/latest":
    redirect_to_page_in_section($pages, array("comic"), function ($pages) {
      return array_key_first($pages);
    });
    break;
  default:
    $search = strtolower(ltrim($_SERVER["REQUEST_URI"], '/'));

    function starts_with($array, $search) {
      $found_starts_with = array_filter($array, function ($key) use ($search) {
        return strpos($key, $search) === 0;
      }, ARRAY_FILTER_USE_KEY);
      return $array[array_key_first($found_starts_with)];
    }

    function contains($array, $search) {
      $found_contains = array_filter($array, function ($key) use ($search) {
        return strpos($key, $search) !== false;
      }, ARRAY_FILTER_USE_KEY);
      return $array[array_key_first($found_contains)];
    }

    $target = $pages[$search];

    if (is_null($target))
      $target = starts_with($pages, $search);

    if (is_null($target))
      $target = contains($pages, $search);

    if (!is_null($target)) {
      header('Location: ' . $target['url']);
    } else {
      http_response_code(404);
      include('404.html');
    }
}
?>
