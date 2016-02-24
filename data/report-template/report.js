function getTabs() {
  return $('.chart-card-tab');
}

function activateTabItem($tabItem) {
  $tabItem.addClass('chart-card-tab-item-active');
  activateTab($tabItem);
}

function activateFirstTab() {
  getTabs().each(function() {
    activateTabItem($(this).find('.chart-card-tab-item:first'));
  });

  $('.chart-tab:first').addClass('chart-tab-active');
}

function addTabClickEventListener() {
  $('.chart-card-tab-item').on('click', function() {
    var $tabItem = $(this);
    $tabItem.siblings('.chart-card-tab-item').removeClass('chart-card-tab-item-active');
    activateTabItem($tabItem);
  });
}

function activateTab($tabItem) {
  var tool = $tabItem.attr('tool');
  var core = $tabItem.attr('core');

  $('.' + tool + '-tab-content').addClass('hide');
  $('.' + tool + '-tab-content-' + core).removeClass('hide');
}

function registerScrollEvent() {
  var header = $('.chart-tabs-container')[0];
  var offset = header.offsetTop + header.offsetHeight;

  $('chart-tab').scroll(function(event) {
    var $element = $(this);
    var $activeTab = $(getActiveTab($element, offset) || {});

    setActiveTab($activeTab);
    setCardTabFixed(cardTabFixed($element, offset, $activeTab));
  });
}

function getActiveTab($raw, offset) {
  return $('chart-container').filter(function(idx, chart) {
    return chart.offsetTop - offset <= $raw.scrollTop();
  }).sort(function(a, b) {return b.offsetTop - a.offsetTop})[0];
}

var currentActiveTabTool = null;
function setActiveTab($activeTab) {
  var tool = $activeTab.attr('tool');
  if (currentActiveTabTool == tool) {
    return;
  }

  currentActiveTabTool = tool;
  $('.chart-tab').removeClass('chart-tab-active');
  $('#' + tool + '-tab').addClass('chart-tab-active');
}

var cardTabs = {};
function cardTabFixed($raw, offset, $activeTab) {
  var $cardTab = getCardTab($activeTab);
  var offsetTop = $activeTab[0].offsetTop + $raw.offset().top - $cardTab.height() - offset;

  return $raw.scrollTop() > offsetTop ? $activeTab : null;
}

function getCardTab($activeTab) {
  if (!($activeTab.id in cardTabs)) {
    cardTabs[$activeTab.attr('id')] = $($activeTab.find('.chart-card-tab')[0]);
  }

  return cardTabs[$activeTab.attr('id')];
}

function setCardTabFixed($activeTab) {
  $('.chart-card-tab').removeClass('chart-card-tab-fixed');
  if (!$activeTab) {
    return;
  }

  var tool = $activeTab.attr('tool');
  $('.chart-card-tab').removeClass('chart-card-tab-fixed');
  $('.' + tool + '-tab').addClass('chart-card-tab-fixed');
}

$(function() {
  activateFirstTab();
  addTabClickEventListener();
  registerScrollEvent();
});



    

    
