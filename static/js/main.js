

// On ready ...
$(function () {

  //
  // Feature Detects
  //

  Modernizr.addTest('touchevents', function() {
    var bool;
    if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
      bool = true;
    } else {
      var query = ['@media (', Modernizr._prefixes.join('touch-enabled),('), 'heartz', ')', '{#modernizr{top:9px;position:absolute}}'].join('');
      Modernizr.testStyles(query, function(node) {
        bool = node.offsetTop === 9;
      });
    }
    return bool;
  });


  //
  // Helpers
  //

  // Functional helpers

  var log   = function () { console.log.apply(console, arguments); return arguments[0]; };
  var flip  = function (λ) { return function (a, b) { λ(b, a); }; };
  var delay = flip(setTimeout);


  // Listen to scroll position

  var onScroll = (function () {
    var listeners = [];

    $(document).on('scroll', function (event) {
      var top = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
      listeners.forEach(function (λ) { λ(top); });
    });

    return listeners.push.bind(listeners);
  }());


  //
  // Global State
  //

  var state = {
    focussed: false
  };


  //
  // Page functions
  //

  // Swap 'open' class on hidden nav

  var $menuToggle = $('#menu-toggle'),
    $menuNav    = $('#menu-nav'),
    isOpen      = false;

  $menuToggle.on('click', function (event) {
    isOpen = !isOpen;
    $menuNav.toggleClass('open', isOpen);
  });


  // Show dropdowns when clicked

  var $triggers  = $('[data-dropdown-trigger]'),
    $dropdowns = $('[data-dropdown]');

  $triggers.on('click', function (event) {
    var targetName = $(this).data('dropdown-trigger'),
      $target    = $dropdowns.filter('[data-dropdown=' + targetName + ']');

    if ($target.hasClass('is-shown')) {
      $dropdowns.removeClass('is-shown');
    } else {
      $dropdowns.removeClass('is-shown');
      $target.addClass('is-shown');
    }

    event.preventDefault();
    return false;
  });

  // Dismiss all when clicking anywhere
  $('body').on('click', function (event) {
    $dropdowns.removeClass('is-shown');
  });


  // Show fixed nav on scroll

  onScroll(function (top) {
    document.body.className = (top >= 112) ? 'fixed' : 'not-fixed';
  });


  // Toggle Comments

  $('.comments').each(function () {
    var $this    = $(this),
      $trigger = $('.trigger', $this);

    var theText = $trigger.html(),
      altText = $trigger.data('alt-text'),
      isOpen  = false;

    $trigger.on('click', function () {
      isOpen = !isOpen;
      $this.toggleClass('is-open', isOpen);
      $trigger.html( isOpen ? altText : theText );
    });
  });


  // Reveal fancy social buttons when visible

  $('.animated-share').each(function () {
    var $this     = $(this),
      threshold = window.innerHeight * 0.1,
      offset    = $this.offset().top;

    function check (p) { return (offset - p - window.innerHeight + threshold) < 0; }
    function show  ()  { $this.addClass('reveal'); }

    // Delay init by half a second - this is so the comic has a chance to load.
    // If the comic doesn't load before the script kicks in, the comic is
    // collapsed so that the animated share is within the trigger range very
    // early on, and will trigger too early. Also, it stops it firing before
    // the user is paying attention

    delay(500, function () {
      if (check(0)) {
        delay(1000, show);
      } else {
        onScroll(function (top) {
          if (check(top)) show();
        });
      }
    });
  });


  // Show Adblock message when loaded

  $('.adblock-message').each(function () {
    var $target = $(this);
    delay(2000, function () {
      $target.addClass('show');
    });
  });


  // Detect whether text-entry elements on the page have focus

  $('#commentform').each(function () {
    var $inputs = $(this).find('textarea, input[type="text"]');
    function setState (mode) { state.focussed = mode; }

    $inputs.on({
      focus: function () { setState(true); },
      blur:  function () { setState(false); }
    });
  });


  // Keyboard Comic Navigation

  $('.page-comic-layout').each(function () {
    var keyCode = { KEY_LEFT: 37, KEY_RIGHT: 39, KEY_SLASH: 191 };
    var prevUrl = $('[data-kb-nav-prev]').attr('href');
    var nextUrl = $('[data-kb-nav-next]').attr('href');
    var randUrl = $('[data-kb-nav-random]').attr('href');

    $(document).on('keydown', function (event) {
      // Don't allow keyboard nav while user is trying to type comments
      if (state.focussed) { return; }

      switch (event.which) {
        case keyCode.KEY_LEFT:
          if (prevUrl) window.location = prevUrl;
          break;
        case keyCode.KEY_RIGHT:
          if (nextUrl) window.location = nextUrl;
          break;
        case keyCode.KEY_SLASH:
          if (randUrl) window.location = randUrl;
          break;
        default:
          return;
      }
    });
  });


  // Touch behaviour for finger snacks

  if (Modernizr.touchevents) {
    $('.finger-snack').on('touchstart click', function (event) {
      var $self = $(this).addClass('touch');
      delay(2000, function () { $self.removeClass('touch'); });

      // Prevent 300ms click event from firing (finger snacks don't link to anything)
      if (event.type === 'click') {
        event.preventDefault();
        return false;
      }
    });
  }

  // Twitch LIVE! link
  $.ajax({
    url: "/twitch/",
    success: function(data) {
      if(data === "live") {
        $("#twitchlink").html("<span>&#128308;</span> LIVE!").addClass("live");
        $(".headsup").html('<a href="https://www.twitch.tv/loadingartist" target="_blank" rel="noopener noreferrer"><img src="/img/header-widgets/live.gif" alt="LIVE on Twitch!"></a>');
        $(".bottomsup").html('<a href="https://www.twitch.tv/loadingartist" target="_blank" rel="noopener noreferrer"><img src="/img/header-widgets/live.gif" alt="LIVE on Twitch!"></a>');
      }
    }
  });


});
