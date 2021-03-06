const React = require('react')
const {
  View,
  Animated,
  StyleSheet,
  ScrollView,
  Text,
  Platform,
  Dimensions,
  ViewPropTypes
} = require('react-native')
const PropTypes = require('prop-types')
const createReactClass = require('create-react-class')

const Button = require('./Button')

const WINDOW_WIDTH = Dimensions.get('window').width

const ScrollableTabBar = createReactClass({
  propTypes: {
    goToPage: PropTypes.func,
    activeTab: PropTypes.number,
    tabs: PropTypes.array,
    backgroundColor: PropTypes.string,
    activeBackgroundColor: PropTypes.string,
    inactiveBackgroundColor: PropTypes.string,
    activeTextColor: PropTypes.string,
    inactiveTextColor: PropTypes.string,
    scrollOffset: PropTypes.number,
    style: ViewPropTypes.style,
    tabStyle: ViewPropTypes.style,
    tabsContainerStyle: ViewPropTypes.style,
    textStyle: Text.propTypes.style,
    renderTab: PropTypes.func,
    underlineStyle: ViewPropTypes.style,
    onScroll: PropTypes.func,
    allowFontScaling: PropTypes.bool
  },

  getDefaultProps () {
    return {
      scrollOffset: 52,
      activeBackgroundColor: 'white',
      inactiveBackgroundColor: 'white',
      activeTextColor: 'navy',
      inactiveTextColor: 'black',
      backgroundColor: null,
      style: {},
      tabStyle: {},
      tabsContainerStyle: {},
      underlineStyle: {},
      allowFontScaling: true
    }
  },

  getInitialState () {
    this._tabsMeasurements = []
    return {
      _leftTabUnderline: new Animated.Value(0),
      _widthTabUnderline: new Animated.Value(0),
      _containerWidth: null
    }
  },

  componentDidMount () {
    this.props.scrollValue.addListener(this.updateView)
  },

  updateView (offset) {
    const position = Math.floor(offset.value)
    const pageOffset = offset.value % 1
    const tabCount = this.props.tabs.length
    const lastTabPosition = tabCount - 1

    if (tabCount === 0 || offset.value < 0 || offset.value > lastTabPosition) {
      return
    }

    if (this.necessarilyMeasurementsCompleted(position, position === lastTabPosition)) {
      this.updateTabPanel(position, pageOffset)
      this.updateTabUnderline(position, pageOffset, tabCount)
    }
  },

  necessarilyMeasurementsCompleted (position, isLastTab) {
    return this._tabsMeasurements[position] &&
      (isLastTab || this._tabsMeasurements[position + 1]) &&
      this._tabContainerMeasurements &&
      this._containerMeasurements
  },

  updateTabPanel (position, pageOffset) {
    const containerWidth = this._containerMeasurements.width
    const tabWidth = this._tabsMeasurements[position].width
    const nextTabMeasurements = this._tabsMeasurements[position + 1]
    const nextTabWidth = (nextTabMeasurements && nextTabMeasurements.width) || 0
    const tabOffset = this._tabsMeasurements[position].left
    const absolutePageOffset = pageOffset * tabWidth
    let newScrollX = tabOffset + absolutePageOffset

    // center tab and smooth tab change (for when tabWidth changes a lot between two tabs)
    newScrollX -= (containerWidth - (1 - pageOffset) * tabWidth - pageOffset * nextTabWidth) / 2
    newScrollX = newScrollX >= 0 ? newScrollX : 0

    if (Platform.OS === 'ios') {
      const rightBoundScroll = this._tabContainerMeasurements.width
      newScrollX = newScrollX > rightBoundScroll ? rightBoundScroll : newScrollX
    }
    if ((this.props.tabs.length - 1) === position) {
      this._scrollView && this._scrollView.scrollToEnd({ animated: false })
    } else {
      this._scrollView && this._scrollView.scrollTo({ x: newScrollX, y: 0, animated: false })
    }
  },

  updateTabUnderline (position, pageOffset, tabCount) {
    let lineLeft = this._tabsMeasurements[position].left
    let lineRight = this._tabsMeasurements[position].right

    if (position < tabCount - 1) {
      let nextTabLeft = this._tabsMeasurements[position + 1].left
      let nextTabRight = this._tabsMeasurements[position + 1].right

      let newLineLeft = (pageOffset * nextTabLeft + (1 - pageOffset) * lineLeft)
      let newLineRight = (pageOffset * nextTabRight + (1 - pageOffset) * lineRight)

      if (this.props.underlineStyle.width) {
        newLineLeft = newLineLeft + (newLineRight - newLineLeft - this.props.underlineStyle.width) / 2
      }

      this.state._leftTabUnderline.setValue(newLineLeft)
      this.state._widthTabUnderline.setValue(newLineRight - newLineLeft)
    } else {
      if (this.props.underlineStyle.width) {
        lineLeft = (lineRight - lineLeft - this.props.underlineStyle.width) / 2 + lineLeft
      }
      this.state._leftTabUnderline.setValue(lineLeft)
      this.state._widthTabUnderline.setValue(lineRight - lineLeft)
    }
  },

  renderTab (name, page, isTabActive, onPressHandler, onLayoutHandler) {
    const { activeBackgroundColor, inactiveBackgroundColor, activeTextColor, inactiveTextColor, textStyle, allowFontScaling } = this.props
    const backgroundColor = isTabActive ? activeBackgroundColor : inactiveBackgroundColor
    const textColor = isTabActive ? activeTextColor : inactiveTextColor
    const fontWeight = isTabActive ? 'bold' : 'normal'

    return <Button
      key={`${name}_${page}`}
      accessible={true}
      accessibilityLabel={name}
      accessibilityTraits='button'
      onPress={() => onPressHandler(page)}
      onLayout={onLayoutHandler}
    >
      <View style={[styles.tab, { backgroundColor }, this.props.tabStyle]}>
        <Text style={[{ color: textColor, fontWeight }, textStyle]} allowFontScaling={allowFontScaling}>
          {name}
        </Text>
      </View>
    </Button>
  },

  measureTab (page, event) {
    const { x, width, height } = event.nativeEvent.layout
    this._tabsMeasurements[page] = { left: x, right: x + width, width, height }
    this.updateView({ value: this.props.scrollValue.__getValue() })
  },

  render () {
    const tabUnderlineStyle = {
      position: 'absolute',
      height: 4,
      backgroundColor: 'navy',
      bottom: 0
    }

    const dynamicTabUnderline = {
      left: this.state._leftTabUnderline,
      width: this.state._widthTabUnderline
    }

    const {
      onScroll
    } = this.props

    return <View
      style={[styles.container, { backgroundColor: this.props.backgroundColor }, this.props.style]}
      onLayout={this.onContainerLayout}
    >
      <ScrollView
        ref={(scrollView) => { this._scrollView = scrollView }}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled={true}
        bounces={false}
        scrollsToTop={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View
          style={[styles.tabs, { width: this.state._containerWidth }, this.props.tabsContainerStyle]}
          ref={'tabContainer'}
          onLayout={this.onTabContainerLayout}
        >
          {this.props.tabs.map((name, page) => {
            const isTabActive = this.props.activeTab === page
            const renderTab = this.props.renderTab || this.renderTab
            return renderTab(name, page, isTabActive, this.props.goToPage, this.measureTab.bind(this, page))
          })}
          <Animated.View style={[tabUnderlineStyle, dynamicTabUnderline, this.props.underlineStyle]} />
        </View>
      </ScrollView>
    </View>
  },

  componentDidUpdate (prevProps) {
    // If the tabs change, force the width of the tabs container to be recalculated
    if (JSON.stringify(prevProps.tabs) !== JSON.stringify(this.props.tabs) && this.state._containerWidth) {
      this.setState({ _containerWidth: null })
    }
  },

  onTabContainerLayout (e) {
    this._tabContainerMeasurements = e.nativeEvent.layout
    let width = this._tabContainerMeasurements.width
    if (width < WINDOW_WIDTH) {
      width = WINDOW_WIDTH
    }
    this.setState({ _containerWidth: width })
    this.updateView({ value: this.props.scrollValue.__getValue() })
  },

  onContainerLayout (e) {
    this._containerMeasurements = e.nativeEvent.layout
    this.updateView({ value: this.props.scrollValue.__getValue() })
  }
})

module.exports = ScrollableTabBar

const styles = StyleSheet.create({
  tab: {
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
    paddingRight: 20
  },
  container: {
    height: 50,
    borderWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ccc'
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  }
})
