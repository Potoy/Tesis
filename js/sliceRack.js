$(function(){

  function debug() {
    // console.log.apply(console, arguments)
  }

  var identity = function (el) { return el }

  $(function createSearchReplace(container) {
    return new SearchReplace(container)
  })

  function SearchReplace(container) {
    console.log(container);
    var self = this
    self.container = $(container)

    self.container.find('button.add').on('click', function(e) {
      self.addSR()
    });
    self.container.on('click', '.delete', function(e) {
      var el = $(e.target).parent()
      if (el.hasClass('template')) return self.blankify(el.hide())
      el.slideUp(100, function() {
        el.remove()
      })
    });
    self.container.find('button.apply').on('click', function() {
      self.recolorImage()
    });
  };


  SearchReplace.prototype.gatherReplacements = function gatherReplacements() {
    var self = this
    var recolors = self.container.find('.recolor');
    a.ok(recolors.length > 0)
    return _.map(recolors, self.gatherReplacement)
  }
  SearchReplace.prototype.gatherReplacement = function gatherReplacement(el) {
    el = $(el)
    positionslider = el.children('.pslider')
    widthslider = el.children('.wslider')
    colorslider = el.children('.rgbslider')
    opacityslider = el.children('.oslider')

    // TODO warn the user when they've entered invalid stuff
    var ocolor = positionslider.val()
    var ncolor = colorslider.val()
    

    return {
        ocolor: ocolor
      , ncolor: ncolor
      , top: range
      , bot: range
    }
  }

  SearchReplace.prototype.addSR = function addSR () {
    var self = this
    var template = self.container.find('.template').first()
    a.equal(template.length, 1)
    var clone = template.clone().removeClass('template').hide()
    self.blankify(clone)
    self.container.find('ol').append(clone)
    clone.slideDown(100)
  }

  // won't show up in the replacements list, b/c blank
  SearchReplace.prototype.blankify = function blankify (el) {
    el.find('.ocolor, .ncolor').val('')
    el.find('.range').val('0')
    return true
  }

  function debug() {
    // console.log.apply(console, arguments)
  }
})