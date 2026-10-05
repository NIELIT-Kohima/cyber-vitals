import React, { useEffect } from 'react';
import { View, Image, Text, TouchableOpacity, Pressable, Platform, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { COLORS } from './constants';

import Dashboard from './screens/dashboard/dashboard';
import SourceList from './screens/sourceScreening/list';
import SourceDetails from './screens/sourceScreening/details';
import TrackingList from './screens/trackingScreen/list';
import TrackingDetails from './screens/trackingScreen/details';
import AccessList from './screens/accessScreen/list';
import AccessDetails from './screens/accessScreen/details';
import MalwareScreen from './screens/malwareScreen/details';
import NotificationScreen from './screens/notificationsScreen/details';
import NetworkDetails from './screens/networkScreen/details';
import AiContentBusterScreen from './screens/aiGenScreen/details';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();



const TAB_ICONS = {
  home: {
    default: require('./assets/home.png'),
    focused: require('./assets/home_focused.png'),
  },
  access: {
    default: require('./assets/lock.png'),
    focused: require('./assets/lock_focused.png'),
  },
  logs: {
    default: require('./assets/file.png'),
    focused: require('./assets/file_focused.png'),
  },
};

const tabStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    paddingVertical: 3,
  },
  iconPill: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconPillActive: {
    backgroundColor: '#fff',
  },
  iconImage: {
    width: 19,
    height: 19,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '700',
    color: '#fff',
  },
});

const TabItem = ({ name, label, focused }) => {
  const iconConfig = TAB_ICONS[name];
  const iconSource = iconConfig ? (focused ? iconConfig.focused : iconConfig.default) : null;

  return (
    <View style={tabStyles.item}>
      <View style={[tabStyles.iconPill, focused && tabStyles.iconPillActive]}>
        {iconSource && (
          <Image
            source={iconSource}
            style={[tabStyles.iconImage, !focused && { opacity: 0.85 }]}
            resizeMode="contain"
          />
        )}
      </View>
      <Text numberOfLines={1} style={[tabStyles.label, focused && tabStyles.labelActive]}>
        {label}
      </Text>
    </View>
  );
};

const AppHeader = ({ backgroundColor = '#fff' }) => {
  return (
    <View
      style={{
        backgroundColor,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        height: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 54 : 90,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <Image
          source={require('./assets/banner.png')}
          style={{ height: 36, width: 140 }}
          resizeMode="contain"
        />
      </View>

      <Image
        source={require('./assets/nielit_logo.png')}
        style={{ height: 36, width: 75, marginBottom: 2 }}
        resizeMode="contain"
      />
    </View>
  );
};

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + 12;

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      backBehavior="history"
      screenOptions={{
        header: () => <AppHeader backgroundColor="#fff" />,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomOffset,
          marginHorizontal: 20,
          backgroundColor: '#000',
          borderRadius: 20,
          height: 68,
          borderTopWidth: 0,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarButton: (props) => (
          <Pressable
            {...props}
            android_ripple={null}
            style={[props.style, { justifyContent: 'center', alignItems: 'center' }]}
          />
        ),
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabItem name="home" label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="AccessList"
        component={AccessList}
        options={{
          tabBarLabel: 'Access',
          tabBarIcon: ({ focused }) => (
            <TabItem name="access" label="Access" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="TrackingList"
        component={TrackingList}
        options={{
          tabBarLabel: 'Logs',
          tabBarIcon: ({ focused }) => (
            <TabItem name="logs" label="Logs" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Malware"
        component={MalwareScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}

export default () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        if (typeof NavigationBar.setStyle === 'function') {
          NavigationBar.setStyle('dark');
        } else if (typeof NavigationBar.setButtonStyleAsync === 'function') {
          NavigationBar.setButtonStyleAsync('dark');
        }

        if (typeof NavigationBar.setBackgroundColorAsync === 'function') {
          NavigationBar.setBackgroundColorAsync('#fff');
        }
      } catch (e) {
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            header: () => <AppHeader backgroundColor="#fff" />,
            contentStyle: { backgroundColor: COLORS.bg },
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />

          <Stack.Screen name="TrackingDetails" component={TrackingDetails} />
          <Stack.Screen name="SourceList" component={SourceList} />
          <Stack.Screen name="SourceDetails" component={SourceDetails} />
          <Stack.Screen name="AccessDetails" component={AccessDetails} />
          <Stack.Screen name="Notifications" component={NotificationScreen} />
          <Stack.Screen name="Network" component={NetworkDetails} />
          <Stack.Screen name="AiContentBuster" component={AiContentBusterScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};