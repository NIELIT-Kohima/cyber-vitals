import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './constants';
import SourceListFront from './screens/sourceScreening/listFront';
import SourceDetailsFront from './screens/sourceScreening/detailsFront';

import TrackingListFront from './screens/trackingScreen/listFront';
import TrackingDetailsFront from './screens/trackingScreen/detailsFront';
import PermListFront from './screens/accessScreen/listFront';
import PermDetailsFront from './screens/accessScreen/detailsFront';
import MalwareScreen from './screens/malwareScreen/detailsFront';
import NotificationScreen from './screens/notificationsScreen/notificationFront';
import networkFront from './screens/networkScreen/networkFront';
import AiContentBusterScreen from './screens/aiGenScreen/aiGenFront';


const Stack = createNativeStackNavigator();
export default () => (
  <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="networkFront" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
        <Stack.Screen name="TrackingListFront" component={TrackingListFront} />
        <Stack.Screen name="TrackingDetailsFront" component={TrackingDetailsFront} />
        <Stack.Screen name="SourceListFront" component={SourceListFront} />
        <Stack.Screen name="SourceDetailsFront" component={SourceDetailsFront} />
        <Stack.Screen name="PermListFront" component={PermListFront} />
        <Stack.Screen name="PermDetailsFront" component={PermDetailsFront} />
        <Stack.Screen name="MalwareScreen" component={MalwareScreen} />
        <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
        <Stack.Screen name="networkFront" component={networkFront} />
        <Stack.Screen name="AiContentBusterScreen" component={AiContentBusterScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  </SafeAreaProvider>
);